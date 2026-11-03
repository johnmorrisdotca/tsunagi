import type { LinkLayout } from "./code.ts";
import { edgeKey, inHex, offBoardCells, sparseMost } from "./code.ts";
import { edgeOpen, neighboursOf, stepBetween, wrappedStep } from "./code-graph.ts";
import {
  CAPITAL_PAIRS,
  CELL_BLOCKED,
  CELL_BRIDGE,
  CELL_EMPTY,
  LINK_BLOCKED,
  LINK_BRIDGE,
  LINK_EMPTY,
  LINK_WALLS,
  stoneLetters,
  TAIL_ORDER,
  tailWord,
  WAYPOINT_LETTERS,
} from "./code-letters.ts";

/**
 * A layout read from its code, or null for a string that is not one: the
 * wrong length, a stray character, a letter used other than twice, or letters
 * not named in reading order. Null rather than a best guess — see AGENTS.md
 * "Nothing Answers What It Cannot Answer".
 *
 * @param code - The native layout, answer or line-progress string.
 * @param size - The number of cells on each side of the board.
 * @returns A layout read from its code, or null for a string that is not one: the wrong length, a stray character, a letter used other than twice, or letters not named in reading order. null rather than a best guess — see AGENTS.md "Nothing Answers What It Cannot Answer".
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * console.log(decodeLayout(givens,4)?.ends.length);
 * ```
 */
export function decodeLayout(code: string, size: number): LinkLayout | null {
  if (typeof code !== "string") return null;
  const [grid, ...tail] = code.split(LINK_WALLS);
  if (grid === undefined || grid.length !== size * size) return null;
  // After the cells: the walls, then the tail's words (`TAIL_ORDER`), each at most once and in that order.
  let wallList: string | null = null;
  let wrap = false;
  let explosions: LinkLayout["explosions"] = null;
  let hex = false;
  let shape = false;
  let sparse = false;
  let portalList: string | null = null;
  let strokes: number | null = null;
  let rank = -1;
  for (const [at, segment] of tail.entries()) {
    const word = tailWord(segment);
    if (word === null) {
      if (at !== 0) return null;
      wallList = segment;
      continue;
    }
    const place = TAIL_ORDER.indexOf(word.word);
    if (place <= rank) return null;
    rank = place;
    if (word.word === "wrap") wrap = true;
    else if (word.word === "hex") hex = true;
    else if (word.word === "shape") shape = true;
    else if (word.word === "sparse") sparse = true;
    else if (word.word === "portals") portalList = word.list!;
    else if (word.word === "strokes") strokes = word.every!;
    else explosions = { every: word.every!, blast: word.blast! };
  }
  const cells: number[] = [];
  const seen: number[][] = [];
  const marked = new Map<number, number>();
  let next = 0;
  const letters = stoneLetters(grid);
  for (let at = 0; at < grid.length; at += 1) {
    const char = grid[at]!;
    if (char === LINK_EMPTY) cells.push(CELL_EMPTY);
    else if (char === LINK_BLOCKED) cells.push(CELL_BLOCKED);
    else if (char === LINK_BRIDGE) cells.push(CELL_BRIDGE);
    else if (letters.length === CAPITAL_PAIRS && WAYPOINT_LETTERS.includes(char)) {
      // A waypoint: an empty cell kept for the pair its letter names.
      cells.push(CELL_EMPTY);
      marked.set(at, WAYPOINT_LETTERS.indexOf(char));
    } else {
      const pair = letters.indexOf(char);
      if (pair === -1) return null;
      if (seen[pair] === undefined) {
        // A new letter must be the next one: A, then B, then C, in reading order.
        if (pair !== next) return null;
        next += 1;
        seen[pair] = [];
      }
      seen[pair]!.push(at);
      cells.push(pair);
    }
  }
  if (seen.length === 0 || seen.some((stones) => stones.length !== 2)) return null;
  // Sparse is a claim about the board, and a board with more lines than that is not one.
  if (sparse && seen.length > sparseMost(size)) return null;
  // A limit of fewer strokes than lines could never be met.
  if (strokes !== null && strokes < seen.length) return null;
  // A waypoint names a pair the board has.
  if ([...marked.values()].some((pair) => pair >= seen.length)) return null;
  const walls = wallList === null ? new Set<string>() : readWalls(wallList, size);
  if (walls === null) return null;
  // A hexagon: none of the square's twists; an odd side and `#` exactly outside it, unless a shape says otherwise.
  if (hex) {
    if (wrap || walls.size > 0 || cells.includes(CELL_BRIDGE)) return null;
    if (!shape) {
      if (size % 2 === 0 || size < 5) return null;
      for (let at = 0; at < cells.length; at += 1) if (!inHex(size, at) && cells[at] !== CELL_BLOCKED) return null;
    }
  }
  // A shape's edges are its own, so they do not join; and nothing stands off the board but what makes it so.
  const off = shape ? offBoardCells(grid, size, hex) : undefined;
  if (shape && wrap) return null;
  // Portals: empty cells away from every other portal, on a square board with no bridges.
  const portalPairs = portalList === null ? [] : readPortals(portalList, size, wrap);
  if (portalPairs === null) return null;
  const portals = new Map<number, number>();
  if (portalPairs.length > 0) {
    if (hex || cells.includes(CELL_BRIDGE)) return null;
    for (const [a, b] of portalPairs) {
      if (cells[a] !== CELL_EMPTY || cells[b] !== CELL_EMPTY || marked.has(a) || marked.has(b)) return null;
      portals.set(a, b);
      portals.set(b, a);
    }
    // No two portal cells side by side, whichever pairs they are of: a line goes in and straight out, and its way is never another portal.
    for (const at of portals.keys())
      for (const beside of squareNeighbours(size, at, wrap)) if (portals.has(beside)) return null;
  }
  // A bridge away from the edge, beside no other bridge, and with no wall on any of its four sides.
  for (let at = 0; at < cells.length; at += 1) {
    if (cells[at] !== CELL_BRIDGE) continue;
    const row = Math.floor(at / size);
    const col = at % size;
    if (row === 0 || col === 0 || row === size - 1 || col === size - 1) return null;
    for (const beside of neighboursOf(size, at))
      if (cells[beside] === CELL_BRIDGE || walls.has(edgeKey(at, beside)) || off?.has(beside)) return null;
  }
  const layout: LinkLayout = {
    size,
    cells,
    ends: seen.map((stones) => [stones[0]!, stones[1]!]),
    walls,
    waypoints: marked,
    wrap,
    portalPairs,
    portals,
    hex,
    sparse,
    strokes,
    explosions,
    ...(off === undefined ? {} : { off }),
  };
  // Two cells joined two ways (beside each other and through a portal, or through two portals) could not be told apart in an answer.
  if (portalPairs.length > 0 && portalsAreAmbiguous(layout)) return null;
  return layout;
}

/** The cell a line comes out at after stepping from `from` into portal cell `into`: beyond the other portal, the same way on; -1 where there is none (off the board, or across a wall).
 *
 * @param layout - The decoded native board and its rule settings.
 * @param from - The preceding cell of a portal step.
 * @param into - The cell entered by the step.
 * @returns The cell a line comes out at after stepping from `from` into portal cell `into`: beyond the other portal, the same way on; -1 where there is none (off the board, or across a wall).
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, portalExit } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(portalExit(layout,0,1));
 * ```
 */
export function portalExit(layout: LinkLayout, from: number, into: number): number {
  const { size } = layout;
  const other = layout.portals.get(into);
  const by = stepBetween(size, from, into, layout.wrap);
  if (other === undefined || by === 0) return -1;
  const out = layout.wrap ? wrappedStep(size, other, by) : other + by;
  if (
    out < 0 ||
    out >= size * size ||
    (!layout.wrap && Math.abs(by) === 1 && Math.floor(out / size) !== Math.floor(other / size))
  )
    return -1;
  return edgeOpen(layout, other, out) ? out : -1;
}

/** Whether two ways for a line to go from one cell to another exist on a board with portals (a portal and a step beside it, or two portals, or one in two directions), which an answer's cells could not tell apart.
 *
 * @param layout - The decoded native board and its rule settings.
 * @returns Whether two ways for a line to go from one cell to another exist on a board with portals (a portal and a step beside it, or two portals, or one in two directions), which an answer's cells could not tell apart.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, portalsAreAmbiguous } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(portalsAreAmbiguous(layout));
 * ```
 */
export function portalsAreAmbiguous(layout: LinkLayout): boolean {
  const { size, wrap } = layout;
  // Each way through a portal as the entry that makes it (from, into) and the entry that makes it backwards (out, the other cell).
  const ways = new Map<string, string[]>();
  for (const into of layout.portals.keys()) {
    for (const from of squareNeighbours(size, into, wrap)) {
      const out = portalExit(layout, from, into);
      if (out === -1) continue;
      // Beside each other already, or the same cell: a way that is no way.
      if (out === from || stepBetween(size, from, out, wrap) !== 0) return true;
      const key = edgeKey(from, out);
      ways.set(key, [...(ways.get(key) ?? []), `${from}>${into}`]);
    }
  }
  // One way is counted from both its ends: two entries, one the other's reverse.
  return [...ways.values()].some((entries) => entries.length > 2);
}

/** The portals after `portals`, or null for a list that is not one: a cell out of the board, a pair of one cell or of two beside each other, a pair or a cell out of order or used twice. */
function readPortals(list: string, size: number, wrap: boolean): [number, number][] | null {
  const out: [number, number][] = [];
  const used = new Set<number>();
  for (const each of list.split(",")) {
    const match = /^(\d+)-(\d+)$/.exec(each);
    if (match === null) return null;
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (a >= b || b >= size * size || used.has(a) || used.has(b)) return null;
    if (out.length > 0 && out[out.length - 1]![0] >= a) return null;
    if (squareNeighbours(size, a, wrap).includes(b)) return null;
    used.add(a);
    used.add(b);
    out.push([a, b]);
  }
  return out;
}

/** The cells beside `at` on a square board, across the join where it wraps. */
function squareNeighbours(size: number, at: number, wrap: boolean): number[] {
  return wrap
    ? [...new Set([-size, 1, size, -1].map((by) => wrappedStep(size, at, by)))].filter((next) => next !== at)
    : neighboursOf(size, at);
}

/** The walls after a layout's `|`, or null for a list that is not one: an edge that is not two neighbouring cells, out of order, or twice. */
function readWalls(list: string, size: number): Set<string> | null {
  const walls = new Set<string>();
  if (list === "") return null;
  let last = "";
  for (const each of list.split(",")) {
    const match = /^(\d+)-(\d+)$/.exec(each);
    if (match === null) return null;
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (a >= b || b >= size * size || !neighboursOf(size, a).includes(b)) return null;
    const key = edgeKey(a, b);
    if (walls.has(key) || (last !== "" && compareEdges(last, key) >= 0)) return null;
    walls.add(key);
    last = key;
  }
  return walls;
}

/** Edges in the one order a layout writes them: by their first cell, then their second.
 *
 * @param x - The horizontal point, edge-code or coordinate value specified by this signature.
 * @param y - The vertical point, edge-code or coordinate value specified by this signature.
 * @returns Edges in the one order a layout writes them: by their first cell, then their second.
 * @example
 * ```ts
 * import { compareEdges } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(compareEdges("1-2","1-5"));
 * ```
 */
export function compareEdges(x: string, y: string): number {
  const [xa, xb] = x.split("-").map(Number) as [number, number];
  const [ya, yb] = y.split("-").map(Number) as [number, number];
  return xa - ya || xb - yb;
}
