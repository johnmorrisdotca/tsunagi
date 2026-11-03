import type { LinkLayout } from "./code.ts";
import { compareEdges } from "./code-decode.ts";
import {
  CAPITAL_PAIRS,
  CELL_BLOCKED,
  CELL_BRIDGE,
  CELL_EMPTY,
  LINK_BLOCKED,
  LINK_BRIDGE,
  LINK_EMPTY,
  LINK_HEX,
  LINK_PORTALS,
  LINK_SHAPE,
  LINK_SPARSE,
  LINK_WALLS,
  LINK_WRAP,
  PAIR_LETTERS,
  WAYPOINT_LETTERS,
} from "./code-letters.ts";

/** The walls as a layout writes them, after the cells: nothing where there are none.
 *
 * @param walls - The blocked undirected edges as a-b strings.
 * @returns The walls as a layout writes them, after the cells: nothing where there are none.
 * @example
 * ```ts
 * import { encodeWalls } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(encodeWalls(new Set(["1-2","1-5"])));
 * ```
 */
export function encodeWalls(walls: Iterable<string>): string {
  const list = [...walls].sort(compareEdges);
  return list.length === 0 ? "" : `${LINK_WALLS}${list.join(",")}`;
}

/** What a pair past `PAIR_LETTERS` is written as: a character no layout reads. */
const NO_LETTER = "?";

/** A layout's code, from its cells, walls, waypoints and whether it wraps: the inverse of `decodeLayout`.
 *
 * @param cells - The row-major decoded cell values.
 * @param walls - The blocked undirected edges as a-b strings.
 * @param more - Optional suffix rules and decorations for the encoded layout.
 * @returns A layout's code, from its cells, walls, waypoints and whether it wraps: the inverse of `decodeLayout`.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, encodeLayout } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(encodeLayout(layout.cells,layout.walls));
 * ```
 */
export function encodeLayout(
  cells: readonly number[],
  walls: Iterable<string> = [],
  more: {
    waypoints?: ReadonlyMap<number, number>;
    wrap?: boolean;
    hex?: boolean;
    shape?: boolean;
    sparse?: boolean;
    portals?: Iterable<readonly [number, number]>;
    strokes?: number | null;
    explosions?: LinkLayout["explosions"];
  } = {},
): string {
  const lastPair = Math.max(-1, ...cells);
  // A pair past the last letter has no spelling: it is written `?`, which no layout reads, so a filling of too many lines is refused rather than thrown on.
  const grid = cells
    .map((cell, at) => {
      const waypoint = more.waypoints?.get(at);
      // A board of thirty-six pairs or more has no waypoints: its small letters are stones.
      if (waypoint !== undefined)
        return lastPair < CAPITAL_PAIRS - 1 ? (WAYPOINT_LETTERS[waypoint] ?? NO_LETTER) : NO_LETTER;
      return cell === CELL_EMPTY
        ? LINK_EMPTY
        : cell === CELL_BLOCKED
          ? LINK_BLOCKED
          : cell === CELL_BRIDGE
            ? LINK_BRIDGE
            : (PAIR_LETTERS[cell] ?? NO_LETTER);
    })
    .join("");
  const boom =
    more.explosions == null ? "" : `${LINK_WALLS}${more.explosions.blast ? "blast" : "boom"}${more.explosions.every}`;
  const portalList = encodePortals(more.portals ?? []);
  const words = [
    more.hex === true ? LINK_HEX : "",
    more.shape === true ? LINK_SHAPE : "",
    more.sparse === true ? LINK_SPARSE : "",
    more.wrap === true ? LINK_WRAP : "",
    portalList,
  ]
    .filter(Boolean)
    .map((word) => `${LINK_WALLS}${word}`)
    .join("");
  const limit = more.strokes == null ? "" : `${LINK_WALLS}strokes${more.strokes}`;
  return grid + encodeWalls(walls) + words + boom + limit;
}

/** The portals as a layout writes them, after `wrap`: each pair as its smaller cell and its larger, the pairs in order; nothing where there are none.
 *
 * @param pairs - The portal-cell pairs.
 * @returns The portals as a layout writes them, after `wrap`: each pair as its smaller cell and its larger, the pairs in order; nothing where there are none.
 * @example
 * ```ts
 * import { encodePortals } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(encodePortals([[3,40]]));
 * ```
 */
export function encodePortals(pairs: Iterable<readonly [number, number]>): string {
  const list = [...pairs].map(([a, b]): [number, number] => (a < b ? [a, b] : [b, a])).sort((x, y) => x[0] - y[0]);
  return list.length === 0 ? "" : `${LINK_PORTALS}${list.map(([a, b]) => `${a}-${b}`).join(",")}`;
}

/** A finished grid's code: the letter of the line through each cell, `#` where blocked, `+` on a bridge.
 *
 * @param owners - The owning pair index for each filled cell.
 * @returns A finished grid's code: the letter of the line through each cell, `#` where blocked, `+` on a bridge.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, encodeAnswer, linesOfAnswer, ownersOf } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const solvedLines = linesOfAnswer(layout,answer)!;
 * console.log(encodeAnswer(ownersOf(layout,solvedLines)));
 * ```
 */
export function encodeAnswer(owners: readonly number[]): string {
  return owners
    .map((owner) =>
      owner === CELL_BLOCKED
        ? LINK_BLOCKED
        : owner === CELL_BRIDGE
          ? LINK_BRIDGE
          : owner < 0
            ? LINK_EMPTY
            : PAIR_LETTERS[owner]!,
    )
    .join("");
}
