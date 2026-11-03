import type { LinkLayout } from "./code.ts";
import { edgeKey } from "./code.ts";
import { LINK_WALLS } from "./code-letters.ts";

/** A layout's cells without its walls or wrap: the part of the code one character a cell.
 *
 * @param code - The native layout, answer or line-progress string.
 * @returns A layout's cells without its walls or wrap: the part of the code one character a cell.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { layoutCells } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * console.log(layoutCells(givens));
 * ```
 */
export function layoutCells(code: string): string {
  const bar = code.indexOf(LINK_WALLS);
  return bar === -1 ? code : code.slice(0, bar);
}

/** The cell beside `at` one step `by` (-1, +1, -size, +size) on a board that wraps: off one edge and in at the other.
 *
 * @param size - The number of cells on each side of the board.
 * @param at - The zero-based cell index.
 * @param by - The signed cell-index step.
 * @returns The cell beside `at` one step `by` (-1, +1, -size, +size) on a board that wraps: off one edge and in at the other.
 * @example
 * ```ts
 * import { wrappedStep } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(wrappedStep(4,3,1));
 * ```
 */
export function wrappedStep(size: number, at: number, by: number): number {
  const row = Math.floor(at / size);
  const col = at % size;
  if (by === 1) return row * size + ((col + 1) % size);
  if (by === -1) return row * size + ((col + size - 1) % size);
  if (by === size) return ((row + 1) % size) * size + col;
  return ((row + size - 1) % size) * size + col;
}

/**
 * The way from `a` to its neighbour `b` as a step (-1, +1, -size, +size),
 * counting a step across a wrapped edge as the step it is — right off the
 * right edge is +1, though the cells' numbers differ by size - 1. On a
 * hexagon, the two slanting steps too: up-right (1 - size) and down-left
 * (size - 1). Zero for cells that are not neighbours.
 *
 * @param size - The number of cells on each side of the board.
 * @param a - The first cell index.
 * @param b - The second cell index.
 * @param wrap - Whether opposite board edges connect.
 * @param hex - Whether to use hexagonal neighbours.
 * @returns The way from `a` to its neighbour `b` as a step (-1, +1, -size, +size), counting a step across a wrapped edge as the step it is — right off the right edge is +1, though the cells' numbers differ by size - 1. On a hexagon, the two slanting steps too: up-right (1 - size) and down-left (size - 1). Zero for cells that are not neighbours.
 * @example
 * ```ts
 * import { stepBetween } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(stepBetween(4,0,1,false));
 * ```
 */
export function stepBetween(size: number, a: number, b: number, wrap: boolean, hex = false): number {
  if (hex) return hexNeighboursOf(size, a).includes(b) ? b - a : 0;
  for (const by of [1, -1, size, -size]) {
    const plain = a + by;
    const same = Math.abs(by) === size || Math.floor(plain / size) === Math.floor(a / size);
    if (plain === b && same && plain >= 0 && plain < size * size) return by;
    if (wrap && wrappedStep(size, a, by) === b) return by;
  }
  return 0;
}

/** A layout's step from `a` to its neighbour `b` (`stepBetween` on its own kind of board), or 0.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param a - The first cell index.
 * @param b - The second cell index.
 * @returns A layout's step from `a` to its neighbour `b` (`stepBetween` on its own kind of board), or 0.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, layoutStep } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(layoutStep(layout,0,1));
 * ```
 */
export function layoutStep(layout: LinkLayout, a: number, b: number): number {
  return stepBetween(layout.size, a, b, layout.wrap, layout.hex);
}

/** Whether a line may step from cell `a` to its neighbour `b`: no wall between them.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param a - The first cell index.
 * @param b - The second cell index.
 * @returns Whether a line may step from cell `a` to its neighbour `b`: no wall between them.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, edgeOpen } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(edgeOpen(layout,0,1));
 * ```
 */
export function edgeOpen(layout: LinkLayout, a: number, b: number): boolean {
  return !layout.walls.has(edgeKey(a, b));
}

/**
 * Each cell's neighbours a line may step to on this board: the four around it,
 * less any across a wall. A bridge is a neighbour like any cell; what a line
 * does on one (go straight over) is the caller's to know.
 *
 * @param layout - The decoded native board and its rule settings.
 * @returns Each cell's neighbours a line may step to on this board: the four around it, less any across a wall. A bridge is a neighbour like any cell; what a line does on one (go straight over) is the caller's to know.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, layoutNeighbours } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(layoutNeighbours(layout)[0]);
 * ```
 */
export function layoutNeighbours(layout: LinkLayout): number[][] {
  const { size } = layout;
  // On a board that wraps, every cell has four neighbours, the edges' ones across the join.
  if (layout.hex) return hexNeighbourTable(size);
  const table = layout.wrap
    ? Array.from({ length: size * size }, (_, at) =>
        [...new Set([-size, 1, size, -1].map((by) => wrappedStep(size, at, by)))].filter((next) => next !== at),
      )
    : neighbourTable(size);
  return layout.walls.size === 0
    ? table
    : table.map((around, at) => around.filter((next) => edgeOpen(layout, at, next)));
}

/** The four neighbours of a cell on a square grid, as indexes; fewer at an edge.
 *
 * @param size - The number of cells on each side of the board.
 * @param at - The zero-based cell index.
 * @returns The four neighbours of a cell on a square grid, as indexes; fewer at an edge.
 * @example
 * ```ts
 * import { neighboursOf } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(neighboursOf(4,0));
 * ```
 */
export function neighboursOf(size: number, at: number): number[] {
  const row = Math.floor(at / size);
  const col = at % size;
  const out: number[] = [];
  if (row > 0) out.push(at - size);
  if (col < size - 1) out.push(at + 1);
  if (row < size - 1) out.push(at + size);
  if (col > 0) out.push(at - 1);
  return out;
}

/** The six neighbours of a cell on the hexagon lattice, as indexes; fewer at an edge of the square (the hexagon's own edge is its `#` cells).
 *
 * @param size - The number of cells on each side of the board.
 * @param at - The zero-based cell index.
 * @returns The six neighbours of a cell on the hexagon lattice, as indexes; fewer at an edge of the square (the hexagon's own edge is its `#` cells).
 * @example
 * ```ts
 * import { hexNeighboursOf } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(hexNeighboursOf(7,24));
 * ```
 */
export function hexNeighboursOf(size: number, at: number): number[] {
  const row = Math.floor(at / size);
  const col = at % size;
  const out: number[] = [];
  if (row > 0) out.push(at - size);
  if (row > 0 && col < size - 1) out.push(at - size + 1);
  if (col < size - 1) out.push(at + 1);
  if (row < size - 1) out.push(at + size);
  if (row < size - 1 && col > 0) out.push(at + size - 1);
  if (col > 0) out.push(at - 1);
  return out;
}

/** Every cell's six neighbours on the hexagon lattice, worked out once for a size.
 *
 * @param size - The number of cells on each side of the board.
 * @returns Every cell's six neighbours on the hexagon lattice, worked out once for a size.
 * @example
 * ```ts
 * import { hexNeighbourTable } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(hexNeighbourTable(7)[24]);
 * ```
 */
export function hexNeighbourTable(size: number): number[][] {
  return Array.from({ length: size * size }, (_, at) => hexNeighboursOf(size, at));
}

/** Every cell's neighbours, worked out once for a size.
 *
 * @param size - The number of cells on each side of the board.
 * @returns Every cell's neighbours, worked out once for a size.
 * @example
 * ```ts
 * import { neighbourTable } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(neighbourTable(4)[0]);
 * ```
 */
export function neighbourTable(size: number): number[][] {
  return Array.from({ length: size * size }, (_, at) => neighboursOf(size, at));
}
