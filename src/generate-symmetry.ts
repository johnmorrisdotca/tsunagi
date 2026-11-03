import {
  CELL_EMPTY,
  compareEdges,
  edgeKey,
  encodePortals,
  LINK_HEX,
  LINK_WALLS,
  type LinkLayout,
  layoutCells,
  layoutStep,
  stoneLetters,
  tailWord,
} from "./code.ts";
import { stepTable } from "./steps.ts";

/** Where cell `at` goes when a board is given `turn` quarter turns and then mirrored across the vertical when `mirror`. */
function movedTo(size: number, at: number, turn: number, mirror: boolean): number {
  let r = Math.floor(at / size);
  let c = at % size;
  for (let each = 0; each < turn; each += 1) [r, c] = [c, size - 1 - r];
  if (mirror) c = size - 1 - c;
  return r * size + c;
}

/** A layout code turned or mirrored: `turn` quarter turns, then a mirror across the vertical when `mirror`. Its walls turn with it.
 *
 * @param code - The native layout, answer or line-progress string.
 * @param size - The number of cells on each side of the board.
 * @param turn - The number of quarter turns.
 * @param mirror - Whether to reflect the board.
 * @returns A layout code turned or mirrored: `turn` quarter turns, then a mirror across the vertical when `mirror`. Its walls turn with it.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { transformed } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * console.log(transformed(givens,4,1,true));
 * ```
 */
export function transformed(code: string, size: number, turn: number, mirror: boolean): string {
  const cells = layoutCells(code);
  const out = new Array<string>(size * size);
  for (let at = 0; at < size * size; at += 1) out[movedTo(size, at, turn, mirror)] = cells[at]!;
  // After the cells: the walls turn with the board; the tail's words (`wrap`, an explosion) are the same however it is turned.
  const tail = code.slice(cells.length).split(LINK_WALLS).filter(Boolean);
  const segments = tail.map((segment) => {
    const word = tailWord(segment);
    // Portals turn with the board, each pair written again with its smaller cell first, the pairs in order.
    if (word?.word === "portals") {
      return encodePortals(
        word.list!.split(",").map((pair) => {
          const [a, b] = pair.split("-").map(Number) as [number, number];
          return [movedTo(size, a, turn, mirror), movedTo(size, b, turn, mirror)] as const;
        }),
      );
    }
    return word !== null
      ? segment
      : segment
          .split(",")
          .map((edge) => {
            const [a, b] = edge.split("-").map(Number) as [number, number];
            return edgeKey(movedTo(size, a, turn, mirror), movedTo(size, b, turn, mirror));
          })
          .sort(compareEdges)
          .join(",");
  });
  return [out.join(""), ...segments].join(LINK_WALLS);
}

/** A code's letters renamed in reading order of first appearance: the one spelling of a layout or answer.
 *
 * @param code - The native layout, answer or line-progress string.
 * @returns A code's letters renamed in reading order of first appearance: the one spelling of a layout or answer.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { relettered } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * console.log(relettered(givens));
 * ```
 */
export function relettered(code: string): string {
  const cells = layoutCells(code);
  const names = new Map<string, string>();
  const letters = stoneLetters(cells);
  // Stones first, in reading order; a waypoint takes the new name of its pair, wherever it stands.
  for (const char of cells) if (letters.includes(char) && !names.has(char)) names.set(char, letters[names.size]!);
  const renamed = [...cells]
    .map((char) => {
      if (letters.includes(char)) return names.get(char)!;
      const upper = char.toUpperCase();
      if (char !== upper && names.has(upper)) return names.get(upper)!.toLowerCase();
      return char;
    })
    .join("");
  return renamed + code.slice(cells.length);
}

/**
 * The least spelling of a layout over its eight turns and mirrors: equal keys
 * are the same board. A hexagon is only turned the ways that keep its lattice
 * — half round, and the two diagonal mirrors (a quarter turn then a mirror) —
 * since a quarter turn alone would make its slanting neighbours the wrong pair.
 *
 * @param code - The native layout, answer or line-progress string.
 * @param size - The number of cells on each side of the board.
 * @returns The least spelling of a layout over its eight turns and mirrors: equal keys are the same board. A hexagon is only turned the ways that keep its lattice — half round, and the two diagonal mirrors (a quarter turn then a mirror) — since a quarter turn alone would make its slanting neighbours the wrong pair.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { symmetryKey } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * console.log(symmetryKey(givens,4));
 * ```
 */
export function symmetryKey(code: string, size: number): string {
  let least: string | null = null;
  const hex = code.slice(layoutCells(code).length).split(LINK_WALLS).includes(LINK_HEX);
  for (let turn = 0; turn < 4; turn += 1) {
    for (const mirror of [false, true]) {
      if (hex && (turn % 2 === 1) !== mirror) continue;
      const each = relettered(transformed(code, size, turn, mirror));
      if (least === null || each < least) least = each;
    }
  }
  return least!;
}

/** How many times an answer's lines turn a corner, over all of them: a line going straight over a bridge turns nowhere on it.
 *
 * @param answer - The native complete answer string or solved lines specified by the signature.
 * @param layout - The decoded native board and its rule settings.
 * @returns How many times an answer's lines turn a corner, over all of them: a line going straight over a bridge turns nowhere on it.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, turnsIn } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * console.log(turnsIn(answer,layout));
 * ```
 */
export function turnsIn(answer: string, layout: LinkLayout): number {
  const steps = stepTable(layout);
  let turns = 0;
  for (let at = 0; at < layoutCells(answer).length; at += 1) {
    if (layout.cells[at] !== CELL_EMPTY) continue;
    // The ways this cell's line goes on from it, as steps: over a bridge or into a portal, the way onto it; across a joined edge, the step it is.
    const ways = steps[at]!.filter((step) => answer[step.to] === answer[at]).map((step) =>
      layoutStep(layout, at, step.over !== -1 ? step.over : step.through.length > 0 ? step.through[0]! : step.to),
    );
    // Straight on is two opposite steps, on a square or a hexagon alike.
    if (ways.length === 2 && ways[0]! + ways[1]! !== 0) turns += 1;
  }
  return turns;
}
