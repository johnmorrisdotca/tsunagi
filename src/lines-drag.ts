import {
  CELL_BLOCKED,
  CELL_BRIDGE,
  edgeOpen,
  hexNeighboursOf,
  type LinkLayout,
  layoutStep,
  portalExit,
} from "./code.ts";
import type { Lines } from "./lines.ts";
import { overBridge } from "./lines.ts";

/** Neighbours with no wall between them: across a joined edge too, on a board that wraps. */
function stepOpen(layout: LinkLayout, a: number, b: number): boolean {
  return layoutStep(layout, a, b) !== 0 && edgeOpen(layout, a, b);
}

function replaced(lines: Lines, pair: number, line: readonly number[]): Lines {
  return lines.map((each, at) => (at === pair ? line : each));
}

/** A press: the lines after it, and the pair now being drawn, or null where the press draws nothing.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @param cell - The zero-based pointer target cell.
 * @returns The lines and drawing pair; drawing is null when the press starts no line.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, noLines, pressAt } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(pressAt(layout,lines,layout.ends[0][0]));
 * ```
 */
export function pressAt(layout: LinkLayout, lines: Lines, cell: number): { lines: Lines; drawing: number | null } {
  const stone = layout.cells[cell]!;
  if (stone === CELL_BRIDGE) return { lines, drawing: null };
  if (stone >= 0) return { lines: replaced(lines, stone, [cell]), drawing: stone };
  const pair = lines.findIndex((line) => line.includes(cell));
  if (pair === -1) return { lines, drawing: null };
  const line = lines[pair]!;
  // A line is never left ending inside a portal: pressed there, it is taken back to before it.
  return { lines: replaced(lines, pair, keptFrom(layout, line, line.indexOf(cell) + 1)), drawing: pair };
}

/** The first `count` cells of a line, less any portal passage cut in two or ended on, so that a line never ends on a portal cell. */
function keptFrom(layout: LinkLayout, line: readonly number[], count: number): number[] {
  return withoutPortalTail(layout, line.slice(0, count));
}

/** A line with the portal cells taken off its end, if it ends on any: a line is never left inside a portal.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param line - The cell sequence of one native line.
 * @returns A line with the portal cells taken off its end, if it ends on any: a line is never left inside a portal.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, linesOfAnswer, withoutPortalTail } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const solvedLines = linesOfAnswer(layout,answer)!;
 * console.log(withoutPortalTail(layout,solvedLines[0]));
 * ```
 */
export function withoutPortalTail(layout: LinkLayout, line: readonly number[]): number[] {
  let kept = [...line];
  while (kept.length > 0 && layout.portals.has(kept[kept.length - 1]!)) kept = kept.slice(0, -1);
  return kept;
}

/** Another pair's line cut back to before `cell`, which it holds: nothing left of a line of only its stone. */
function cutBefore(layout: LinkLayout, lines: Lines, other: number, cell: number): Lines {
  const held = lines[other]!;
  const cut = keptFrom(layout, held, held.indexOf(cell));
  return replaced(lines, other, cut.length <= 1 ? [] : cut);
}

/** A drag of the pair being drawn into `cell`: one step, as the finger enters a cell.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @param pair - The zero-based pair index.
 * @param cell - The zero-based pointer target cell.
 * @returns A drag of the pair being drawn into `cell`: one step, as the finger enters a cell.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, dragTo, linesOfAnswer, noLines, pressAt } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * const solvedLines = linesOfAnswer(layout,answer)!;
 * console.log(dragTo(layout,pressAt(layout,lines,layout.ends[0][0]).lines,0,solvedLines[0][1]));
 * ```
 */
export function dragTo(layout: LinkLayout, lines: Lines, pair: number, cell: number): Lines {
  const line = lines[pair]!;
  if (line.length === 0) return lines;
  const tip = line[line.length - 1]!;
  if (cell === tip) return lines;
  const back = line.indexOf(cell);
  // Back over itself: shorter, to that cell, or to before a portal it is back over.
  if (back !== -1) return replaced(lines, pair, keptFrom(layout, line, back + 1));
  if (!stepOpen(layout, tip, cell)) return lines;
  if (layout.portals.has(cell)) return intoPortal(layout, lines, pair, cell);
  // Past its own far stone: a joined line only shortens.
  if (line.length >= 2 && layout.cells[tip] === pair) return lines;
  // Off a bridge only straight on.
  if (layout.cells[tip] === CELL_BRIDGE && line.length >= 2 && cell - tip !== tip - line[line.length - 2]!)
    return lines;
  const what = layout.cells[cell]!;
  if (what === CELL_BLOCKED || (what >= 0 && what !== pair)) return lines;
  // A waypoint is its own pair's alone.
  const waypoint = layout.waypoints.get(cell);
  if (waypoint !== undefined && waypoint !== pair) return lines;
  if (what === CELL_BRIDGE) {
    const acrossNow = Math.abs(cell - tip) === 1;
    const over = overBridge(lines, cell);
    // Never over itself: the other way over is not this line's.
    if ((acrossNow ? over.down : over.across) === pair) return lines;
    const taken = acrossNow ? over.across : over.down;
    let next = lines;
    if (taken !== -1) {
      const cut = lines[taken]!.slice(0, lines[taken]!.indexOf(cell));
      next = replaced(next, taken, cut.length <= 1 ? [] : cut);
    }
    return replaced(next, pair, [...line, cell]);
  }
  let next = lines;
  const other = lines.findIndex((each, at) => at !== pair && each.includes(cell));
  if (other !== -1) {
    const cut = lines[other]!.slice(0, lines[other]!.indexOf(cell));
    next = replaced(next, other, cut.length <= 1 ? [] : cut);
  }
  return replaced(next, pair, [...line, cell]);
}

/**
 * A drag into a portal cell from the line's tip: the line goes in there, out of
 * the other portal and on into the cell beyond it, all at once, so that it never
 * rests inside one. Nothing happens where the way out is no way: blocked, off
 * the board, across a wall, another pair's stone, or a cell this line already
 * has.
 */
function intoPortal(layout: LinkLayout, lines: Lines, pair: number, cell: number): Lines {
  const line = lines[pair]!;
  const tip = line[line.length - 1]!;
  // Past its own far stone: a joined line only shortens.
  if (line.length >= 2 && layout.cells[tip] === pair) return lines;
  const out = portalExit(layout, tip, cell);
  const other = layout.portals.get(cell)!;
  if (out === -1 || out === tip) return lines;
  const what = layout.cells[out]!;
  if (what === CELL_BLOCKED || (what >= 0 && what !== pair)) return lines;
  const waypoint = layout.waypoints.get(out);
  if (waypoint !== undefined && waypoint !== pair) return lines;
  if (line.includes(cell) || line.includes(other) || line.includes(out)) return lines;
  let next = lines;
  for (const taken of [cell, other, out]) {
    const holder = next.findIndex((each, at) => at !== pair && each.includes(taken));
    if (holder !== -1) next = cutBefore(layout, next, holder, taken);
  }
  return replaced(next, pair, [...line, cell, other, out]);
}

/**
 * A drag that jumped several cells between two pointer events (a quick
 * flick): walked one cell at a time along the row, then the column, so a fast
 * finger draws what a slow one would. Stops at the first cell a step refuses.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @param pair - The zero-based pair index.
 * @param cell - The zero-based pointer target cell.
 * @returns A drag that jumped several cells between two pointer events (a quick flick): walked one cell at a time along the row, then the column, so a fast finger draws what a slow one would. Stops at the first cell a step refuses.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, dragThrough, noLines } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(dragThrough(layout,lines,0,layout.ends[0][0]));
 * ```
 */
export function dragThrough(layout: LinkLayout, lines: Lines, pair: number, cell: number): Lines {
  const size = layout.size;
  let now = lines;
  for (let guard = 0; guard < size * 2; guard += 1) {
    const line = now[pair]!;
    if (line.length === 0) return now;
    const tip = line[line.length - 1]!;
    // Already there, or one step away (across a joined edge counts): straight to it.
    if (tip === cell || line.includes(cell) || layoutStep(layout, tip, cell) !== 0)
      return dragTo(layout, now, pair, cell);
    const [tr, tc] = [Math.floor(tip / size), tip % size];
    const [cr, cc] = [Math.floor(cell / size), cell % size];
    // On a square, along the row and then the column; on a hexagon, whichever of the six steps comes nearest.
    const step = layout.hex
      ? hexToward(size, tip, cell)
      : tc !== cc
        ? tip + Math.sign(cc - tc)
        : tip + Math.sign(cr - tr) * size;
    const after = dragTo(layout, now, pair, step);
    if (after === now) return now;
    now = after;
    // Through a portal the line is somewhere else: what is left of the walk was aimed from where it was.
    if (portalCells(layout, now[pair]!) !== portalCells(layout, line)) return now;
  }
  return now;
}

/** How many portal cells a line has. */
function portalCells(layout: LinkLayout, line: readonly number[]): number {
  return layout.portals.size === 0 ? 0 : line.filter((cell) => layout.portals.has(cell)).length;
}

/**
 * HOW FAR A FINGER IS FROM THE END OF THE LINE IT DRAWS, in rows and columns,
 * once that line has been through a portal. The line comes out of a portal far
 * from the finger that went into the other, so a finger over a cell draws
 * toward that cell moved by the reach: it starts at none and is set again each
 * time the line goes through a portal or back over one, so that the finger is
 * over the line's end from then on, and moving it a cell moves the end a cell.
 *
 * @example
 * ```ts
 * import type { Reach } from "@johnmorrisdotca/tsunagi";
 *
 * const value: Reach = {dr:0,dc:1};
 * console.log(value);
 * ```
 */
export type Reach = { dr: number; dc: number };

/** No distance: the finger draws toward the cell it is over.
 *
 * @example
 * ```ts
 * import { NO_REACH } from "@johnmorrisdotca/tsunagi";
 * console.log(NO_REACH);
 * ```
 */
export const NO_REACH: Reach = { dr: 0, dc: 0 };

/**
 * A finger over `finger`, drawing the line of `pair`, with the reach it had:
 * the lines after it and the reach now. This is `dragThrough` for a board with
 * portals; on a board without them the reach stays none and it is the same.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @param pair - The zero-based pair index.
 * @param finger - The current finger target cell.
 * @param reach - The previous drag direction for continuous pointer movement.
 * @returns A finger over `finger`, drawing the line of `pair`, with the reach it had: the lines after it and the reach now. This is `dragThrough` for a board with portals; on a board without them the reach stays none and it is the same.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, dragFinger, noLines } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(dragFinger(layout,lines,0,layout.ends[0][0]));
 * ```
 */
export function dragFinger(
  layout: LinkLayout,
  lines: Lines,
  pair: number,
  finger: number,
  reach: Reach = NO_REACH,
): { lines: Lines; reach: Reach } {
  const { size } = layout;
  let row = Math.floor(finger / size) + reach.dr;
  let col = (finger % size) + reach.dc;
  if (layout.wrap) {
    row = ((row % size) + size) % size;
    col = ((col % size) + size) % size;
  } else if (row < 0 || col < 0 || row >= size || col >= size) return { lines, reach };
  const before = lines[pair]!;
  const after = dragThrough(layout, lines, pair, row * size + col);
  const now = after[pair]!;
  if (after === lines || portalCells(layout, now) === portalCells(layout, before) || now.length === 0)
    return { lines: after, reach };
  // A portal gone through or back over: the finger is over the end of the line from here.
  const tip = now[now.length - 1]!;
  return {
    lines: after,
    reach: { dr: Math.floor(tip / size) - Math.floor(finger / size), dc: (tip % size) - (finger % size) },
  };
}

/** The neighbour of `from` on the hexagon lattice fewest steps from `to`. */
function hexToward(size: number, from: number, to: number): number {
  const apart = (a: number, b: number) => {
    const dq = (b % size) - (a % size);
    const dr = Math.floor(b / size) - Math.floor(a / size);
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
  };
  return hexNeighboursOf(size, from).reduce((best, next) => (apart(next, to) < apart(best, to) ? next : best));
}

/** Letting go: a line of only its stone is no line (a tap on a stone clears it), and a line ends before a bridge it stopped on.
 *
 * @param lines - The native cell lists for every pair.
 * @param layout - The decoded native board and its rule settings.
 * @returns Letting go: a line of only its stone is no line (a tap on a stone clears it), and a line ends before a bridge it stopped on.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, letGo, noLines } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(letGo(lines,layout));
 * ```
 */
export function letGo(lines: Lines, layout?: LinkLayout): Lines {
  const onBridge = (line: readonly number[]) =>
    layout !== undefined && line.length > 0 && layout.cells[line[line.length - 1]!] === CELL_BRIDGE;
  if (!lines.some((line) => line.length === 1 || onBridge(line))) return lines;
  return lines.map((line) => {
    const kept = onBridge(line) ? line.slice(0, -1) : line;
    return kept.length === 1 ? [] : kept;
  });
}
