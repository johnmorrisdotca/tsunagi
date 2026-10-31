import { hexNeighboursOf, inHex, LINK_BLOCKED, type LinkLayout, layoutNeighbours, neighboursOf } from "./code.ts";

/**
 * THE BOARD A GENERATOR WORKS ON, as a graph: which cells a line may stand on, and
 * which cells each is beside. A square, an oblong, a honeycomb, a board whose edges
 * join and a board of any outline are all this one thing, so one generator
 * (`generator.ts`) makes all of them.
 *
 * Every board is still written as a square of cells (`code.ts`), and one that is not
 * the whole of its square says `shape`, so a level is read, solved and checked by what
 * has always read, solved and checked levels.
 *
 * Imports carry their `.ts` so a level script can run this under plain node.
 *
 * @example
 * ```ts
 * import { squareBoard } from "@johnmorrisdotca/tsunagi";
 * import type { TsunagiBoard } from "@johnmorrisdotca/tsunagi";
 *
 * const value: TsunagiBoard = squareBoard(5);
 * console.log(value.cells.length);
 * ```
 */
export type TsunagiBoard = {
  /** The side of the square it is written in. */
  size: number;
  hex: boolean;
  wrap: boolean;
  /** Whether it says `shape`: some of its square is off the board. */
  shape: boolean;
  /** The cells of the square no line may stand on: off the board, and blocked. */
  closed: ReadonlySet<number>;
  /** Those inside the board, which are drawn as blocked. */
  blocked: ReadonlySet<number>;
  /** The cells a line may stand on, in reading order. */
  cells: readonly number[];
  /** What is beside each cell of the square: only cells a line may stand on. */
  around: readonly (readonly number[])[];
};

/** A layout with nothing on it, for asking what a cell is beside. */
function bareLayout(size: number, wrap: boolean): LinkLayout {
  return {
    size,
    cells: new Array<number>(size * size).fill(-1),
    ends: [],
    walls: new Set(),
    waypoints: new Map(),
    wrap,
    portalPairs: [],
    portals: new Map(),
    hex: false,
    sparse: false,
    strokes: null,
    explosions: null,
  };
}

/** What a board is made from: its square, what is off it, what is blocked on it. */
function boardOf(
  size: number,
  on: (at: number) => boolean,
  more: { hex?: boolean; wrap?: boolean; shape?: boolean; blocked?: ReadonlySet<number> } = {},
): TsunagiBoard {
  const hex = more.hex === true;
  const wrap = more.wrap === true;
  const blocked = more.blocked ?? new Set<number>();
  const closed = new Set<number>(blocked);
  for (let at = 0; at < size * size; at += 1) if (!on(at)) closed.add(at);
  const beside = wrap ? layoutNeighbours(bareLayout(size, true)) : null;
  const around = Array.from({ length: size * size }, (_, at) => {
    if (closed.has(at)) return [];
    const near = beside !== null ? beside[at]! : hex ? hexNeighboursOf(size, at) : neighboursOf(size, at);
    return near.filter((next) => !closed.has(next));
  });
  const cells = Array.from({ length: size * size }, (_, at) => at).filter((at) => !closed.has(at));
  return { size, hex, wrap, shape: more.shape === true, closed, blocked, cells, around };
}

/** A square board, its edges joined if `wrap`, with any blocked cells.
 *
 * @param side - The number of cells on each side.
 * @param more - Whether the edges join, and the cells no line enters.
 * @returns The board as a graph.
 * @example
 * ```ts
 * import { squareBoard } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(squareBoard(5,{wrap:true}).around[0]);
 * ```
 */
export function squareBoard(side: number, more: { wrap?: boolean; blocked?: ReadonlySet<number> } = {}): TsunagiBoard {
  return boardOf(side, () => true, more);
}

/** A board `wide` by `tall`, written in a square of the longer side with the rest off the board. A square one is `squareBoard`.
 *
 * @param wide - The cells across.
 * @param tall - The cells down.
 * @param more - The cells no line enters.
 * @returns The board as a graph.
 * @example
 * ```ts
 * import { oblongBoard } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(oblongBoard(4,6).cells.length);
 * ```
 */
export function oblongBoard(wide: number, tall: number, more: { blocked?: ReadonlySet<number> } = {}): TsunagiBoard {
  const size = Math.max(wide, tall);
  if (wide === tall) return boardOf(size, () => true, more);
  return boardOf(size, (at) => at % size < wide && Math.floor(at / size) < tall, { ...more, shape: true });
}

/** A hexagon of hexagons of this radius, as the levels' hexagons are: side 2R + 1.
 *
 * @param radius - The cells from the middle to an edge.
 * @returns The board as a graph.
 * @example
 * ```ts
 * import { hexagonBoard } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(hexagonBoard(3).cells.length);
 * ```
 */
export function hexagonBoard(radius: number): TsunagiBoard {
  const size = 2 * radius + 1;
  return boardOf(size, (at) => inHex(size, at), { hex: true });
}

/**
 * A honeycomb a little taller than it is wide, for a phone held upright (John, 2026-10-01: "slightly vertical maps for
 * the hex"): a hexagon of `radius` whose widest rows are repeated `extra` more times down the middle, each row sitting
 * half a cell along from the last, so the sides run straight down. With no extra rows it is the hexagon itself.
 *
 * @param radius - The cells from the middle to the side.
 * @param extra - The rows added down the middle.
 * @returns The board as a graph.
 * @example
 * ```ts
 * import { tallHexagonBoard } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(tallHexagonBoard(3,3).cells.length);
 * ```
 */
export function tallHexagonBoard(radius: number, extra: number): TsunagiBoard {
  if (extra === 0) return hexagonBoard(radius);
  const size = 2 * radius + extra + 1;
  // The middle of the board across, in half cells: x = column + row / 2.
  const middle = 3 * radius + extra;
  const on = (at: number): boolean => {
    const row = Math.floor(at / size);
    const x = 2 * (at % size) + row;
    const fromEnd = Math.min(row, size - 1 - row, radius);
    return Math.abs(x - middle) <= radius + fromEnd;
  };
  return boardOf(size, on, { hex: true, shape: true });
}

/**
 * A board of any outline: every cell of the square `keep` says yes to, and the rest off the board. A hole in the middle
 * reads as blocked cells, since it does not reach the edge (`offBoardCells`).
 *
 * @param size - The side of the square it is written in.
 * @param keep - Whether a cell is on the board.
 * @param more - Whether it is a honeycomb.
 * @returns The board as a graph.
 * @example
 * ```ts
 * import { shapedBoard } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(shapedBoard(5,(at)=>at%5!==2||at>=10).cells.length);
 * ```
 */
export function shapedBoard(size: number, keep: (at: number) => boolean, more: { hex?: boolean } = {}): TsunagiBoard {
  const hex = more.hex === true;
  const grid = Array.from({ length: size * size }, (_, at) => (keep(at) ? "." : LINK_BLOCKED)).join("");
  // What does not reach the edge is a hole, which the layout will read as blocked cells.
  const reached = new Set<number>();
  const waiting: number[] = [];
  const visit = (at: number): void => {
    if (grid[at] === LINK_BLOCKED && !reached.has(at)) {
      reached.add(at);
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
  const blocked = new Set<number>();
  for (let at = 0; at < size * size; at += 1) if (grid[at] === LINK_BLOCKED && !reached.has(at)) blocked.add(at);
  return boardOf(size, keep, { hex, shape: true, blocked });
}
