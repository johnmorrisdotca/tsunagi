import { hexNeighboursOf, neighboursOf } from "./code-graph.ts";
import { LINK_BLOCKED } from "./code-letters.ts";

export { compareEdges, decodeLayout, portalExit, portalsAreAmbiguous } from "./code-decode.ts";
export { encodeAnswer, encodeLayout, encodePortals, encodeWalls } from "./code-encode.ts";
export {
  edgeOpen,
  hexNeighboursOf,
  hexNeighbourTable,
  layoutCells,
  layoutNeighbours,
  layoutStep,
  neighboursOf,
  neighbourTable,
  stepBetween,
  wrappedStep,
} from "./code-graph.ts";
export {
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
  stoneLetters,
  tailWord,
  WAYPOINT_LETTERS,
} from "./code-letters.ts";

/** A decoded board with pairs, cells, walls, waypoints, wrapping, portals and optional limits.
 *
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 * import type { LinkLayout } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const value: LinkLayout = layout;
 * console.log(value);
 * ```
 */
export type LinkLayout = {
  size: number;
  /** One per cell: `CELL_EMPTY` (a waypoint too), `CELL_BLOCKED`, `CELL_BRIDGE`, or the pair a stone belongs to. */
  cells: number[];
  /** Each pair's two stones, as cell indexes, the first met in reading order first. */
  ends: [number, number][];
  /** The edges no line may cross, each as `edgeKey(a, b)`. Empty for a board with none. */
  walls: ReadonlySet<string>;
  /** Empty cells only one pair's line may use, and must: the waypoint's cell to its pair. */
  waypoints: ReadonlyMap<number, number>;
  /** Whether the edges join: left to right and top to bottom. */
  wrap: boolean;
  /** Each portal's two cells, the smaller first, the pairs in order of their smaller cell. Empty for a board with none. */
  portalPairs: readonly (readonly [number, number])[];
  /** Each portal cell's other cell. Empty for a board with none. */
  portals: ReadonlyMap<number, number>;
  /** Whether the board is a hexagon of hexagons: six neighbours a cell, the square's corners off the board. */
  hex: boolean;
  /** The cells of its square that are off the board, on a board with a `shape`: not drawn, and not cells at all. Empty or left out for a whole square, and for a plain hexagon, whose corners `inHex` says. */
  off?: ReadonlySet<number>;
  /** Whether the board is sparse: few, long lines, at most `sparseMost` of them. */
  sparse: boolean;
  /** How many strokes the player has to solve it in, or null for no limit. */
  strokes: number | null;
  /** Explosions: every `every` strokes a drawn line is broken — cut back by half, or, with `blast`, wiped with a neighbour cut too. Null for none. */
  explosions: { every: number; blast: boolean } | null;
};

/**
 * The cells of a square that are off the board on a board with a `shape`: every `#` that reaches the square's edge
 * through other `#` cells, by a square's four steps or a honeycomb's six.
 *
 * @param grid - The cells of the layout, one character each.
 * @param size - The number of cells on each side of the board.
 * @param hex - Whether to use hexagonal neighbours.
 * @returns The cells of the square that are off the board.
 * @example
 * ```ts
 * import { offBoardCells } from "@johnmorrisdotca/tsunagi";
 *
 * console.log([...offBoardCells("A.#A.#####",3,false)]);
 * ```
 */
export function offBoardCells(grid: string, size: number, hex: boolean): Set<number> {
  const off = new Set<number>();
  const waiting: number[] = [];
  const visit = (at: number): void => {
    if (grid[at] === LINK_BLOCKED && !off.has(at)) {
      off.add(at);
      waiting.push(at);
    }
  };
  for (let at = 0; at < size; at += 1) {
    visit(at);
    visit(size * size - 1 - at);
    visit(at * size);
    visit(at * size + size - 1);
  }
  while (waiting.length > 0) {
    const at = waiting.pop()!;
    for (const next of hex ? hexNeighboursOf(size, at) : neighboursOf(size, at)) visit(next);
  }
  return off;
}

/** Whether a cell is on the board: every cell of a whole square, the hexagon's own of a plain hexagon, and those a shape keeps.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param at - The zero-based cell index.
 * @returns Whether the cell is on the board.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, onTheBoard } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(onTheBoard(decodeLayout(TSUNAGI_4[0][0],4)!,0));
 * ```
 */
export function onTheBoard(layout: LinkLayout, at: number): boolean {
  if (layout.off !== undefined && layout.off.size > 0) return !layout.off.has(at);
  return !layout.hex || inHex(layout.size, at);
}

/** The most lines a sparse board of this side has: two thirds of the side — six on a 9×9, where nine is usual.
 *
 * @param size - The number of cells on each side of the board.
 * @returns The most lines a sparse board of this side has: two thirds of the side — six on a 9×9, where nine is usual.
 * @example
 * ```ts
 * import { sparseMost } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(sparseMost(9));
 * ```
 */
export function sparseMost(size: number): number {
  return Math.floor((2 * size) / 3);
}

/** The hexagon's radius on a board of this side: R, for a side of 2R + 1.
 *
 * @param size - The number of cells on each side of the board.
 * @returns The hexagon's radius on a board of this side: R, for a side of 2R + 1.
 * @example
 * ```ts
 * import { hexRadius } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(hexRadius(7));
 * ```
 */
export function hexRadius(size: number): number {
  return Math.floor(size / 2);
}

/** Whether a cell of the square is inside the hexagon: at most R lattice steps from the middle.
 *
 * @param size - The number of cells on each side of the board.
 * @param at - The zero-based cell index.
 * @returns Whether a cell of the square is inside the hexagon: at most R lattice steps from the middle.
 * @example
 * ```ts
 * import { inHex } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(inHex(7,24));
 * ```
 */
export function inHex(size: number, at: number): boolean {
  const radius = hexRadius(size);
  const x = (at % size) - radius;
  const z = Math.floor(at / size) - radius;
  return Math.max(Math.abs(x), Math.abs(z), Math.abs(x + z)) <= radius;
}

/** An edge between two neighbouring cells, the same whichever way round they are named.
 *
 * @param a - The first cell index.
 * @param b - The second cell index.
 * @returns An edge between two neighbouring cells, the same whichever way round they are named.
 * @example
 * ```ts
 * import { edgeKey } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(edgeKey(1,2));
 * ```
 */
export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
