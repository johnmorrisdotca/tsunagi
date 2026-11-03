import { CELL_BLOCKED, CELL_BRIDGE, type LinkLayout, layoutStep, wrappedStep } from "./code.ts";
import type { Lines } from "./lines.ts";

/*
 * THE LINES AS A KEPT RUN'S PROGRESS: one character a cell, so an unfinished
 * level is kept like any other puzzle (`PuzzleRun.progress`). `.` is a cell no
 * line starts or passes through; `*` a stone a line starts from; `n`, `e`,
 * `s` or `w` a cell whose line came into it from that side — and on a
 * hexagon, `u` from the cell up and to the right, `v` from down and to the left.
 * `p` is the second cell of a portal a line went through, which it came to from
 * the first.
 */
const FROM: Record<string, number> = { n: 0, e: 1, s: 2, w: 3, u: 4, v: 5 };
const PROGRESS_CHARS = /^[.*neswuvp]*$/;

/** Encode current lines as native resumable progress for this layout.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @returns Encode current lines as native resumable progress for this layout.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, encodeLines, noLines } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(encodeLines(layout,lines));
 * ```
 */
export function encodeLines(layout: LinkLayout, lines: Lines): string {
  const size = layout.size;
  const out = new Array<string>(size * size).fill(".");
  for (const line of lines) {
    line.forEach((cell, at) => {
      // A bridge is written by the cell beyond it, which says it came from the bridge's side.
      if (layout.cells[cell] === CELL_BRIDGE) return;
      if (at === 0) {
        out[cell] = "*";
        return;
      }
      const came = line[at - 1]!;
      // Through a portal: it came from the portal's other cell.
      if (layout.portals.get(cell) === came) {
        out[cell] = "p";
        return;
      }
      // Which side it came in from, across a joined edge too: the step from here back to where it came from.
      const by = layoutStep(layout, cell, came);
      out[cell] =
        by === -size ? "n" : by === 1 ? "e" : by === size ? "s" : by === -1 ? "w" : by === 1 - size ? "u" : "v";
    });
  }
  return out.join("");
}

/** Whether a progress code has the shape of one: a size's cells in the progress alphabet.
 *
 * @param code - The native layout, answer or line-progress string.
 * @param size - The number of cells on each side of the board.
 * @returns Whether a progress code has the shape of one: a size's cells in the progress alphabet.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, encodeLines, linesCodeFits, noLines } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(linesCodeFits(encodeLines(layout,lines),4));
 * ```
 */
export function linesCodeFits(code: string, size: number): boolean {
  return code.length === size * size && PROGRESS_CHARS.test(code);
}

/**
 * Lines read back from a progress code against the layout they were drawn on,
 * or null for a code that does not describe lines on it: a start that is not
 * a stone, a step from nowhere, a line through another pair's stone, a cell
 * two lines claim.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param code - The native layout, answer or line-progress string.
 * @returns Lines read back from a progress code against the layout they were drawn on, or null for a code that does not describe lines on it: a start that is not a stone, a step from nowhere, a line through another pair's stone, a cell two lines claim.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, decodeLines, encodeLines, noLines } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(decodeLines(layout,encodeLines(layout,lines)));
 * ```
 */
export function decodeLines(layout: LinkLayout, code: string): Lines | null {
  const size = layout.size;
  if (!linesCodeFits(code, size)) return null;
  const next = new Map<number, number>();
  for (let cell = 0; cell < code.length; cell += 1) {
    const char = code[cell]!;
    if (char === "." || char === "*") continue;
    if (char === "p") {
      // The second cell of a portal: it came from the first.
      const first = layout.portals.get(cell);
      if (first === undefined || code[first] === "." || next.has(first)) return null;
      next.set(first, cell);
      continue;
    }
    const dir = FROM[char]!;
    const by = [-size, 1, size, -1, 1 - size, size - 1][dir]!;
    let came = layout.wrap ? wrappedStep(size, cell, by) : cell + by;
    if (came < 0 || came >= size * size || layoutStep(layout, cell, came) === 0) return null;
    // From a bridge: from the cell on its far side, over it.
    if (layout.cells[came] === CELL_BRIDGE) came = came - (cell - came);
    if (came < 0 || came >= size * size || code[came] === "." || next.has(came)) return null;
    next.set(came, cell);
  }
  const lines: number[][] = layout.ends.map(() => []);
  const used = new Set<number>();
  for (let cell = 0; cell < code.length; cell += 1) {
    if (code[cell] !== "*") continue;
    const pair = layout.cells[cell]!;
    if (pair < 0 || lines[pair]!.length > 0) return null;
    const line = [cell];
    used.add(cell);
    let at = cell;
    while (next.has(at)) {
      const after = next.get(at)!;
      // Two cells apart: the bridge between them is in the line.
      if (layoutStep(layout, at, after) === 0 && layout.portals.get(at) !== after) {
        const bridge = (at + after) / 2;
        if (layout.cells[bridge] !== CELL_BRIDGE) return null;
        line.push(bridge);
      }
      at = after;
      const what = layout.cells[at]!;
      if (used.has(at) || what === CELL_BLOCKED || (what >= 0 && what !== pair)) return null;
      line.push(at);
      used.add(at);
      if (what === pair) break;
    }
    if (next.has(at) && layout.cells[at] === pair && line.length > 1) return null;
    lines[pair] = line.length === 1 ? [] : line;
  }
  // Every stepped cell must belong to some line.
  for (let cell = 0; cell < code.length; cell += 1) if (code[cell] !== "." && !used.has(cell)) return null;
  return lines;
}
