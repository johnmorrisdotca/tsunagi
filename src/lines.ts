import { CELL_BLOCKED, CELL_BRIDGE, CELL_EMPTY, edgeOpen, encodeAnswer, hexNeighboursOf, layoutStep, PAIR_LETTERS, portalExit, wrappedStep, type LinkLayout } from "./code.ts";
import { stepTable } from "./steps.ts";

/**
 * THE LINES A PLAYER HAS DRAWN, and what a press and a drag do to them.
 *
 * Pure, and the only place the drawing rules live: the grid reports where a
 * finger went, and this says what the lines are now. Each pair has one line,
 * an ordered list of cells starting at one of its stones; an empty list is no
 * line. Every function returns new lines and leaves the ones it was given
 * alone, the way the engine does.
 *
 *  - Press on a stone: a fresh line starts there, and the pair's old one goes.
 *    A press let go without moving is a tap, and clears the line.
 *  - Press on a line: it is cut back to that cell, and drawing goes on from it.
 *  - Drag into the next cell: the line grows. Back over itself: it shortens,
 *    cell by cell, as the finger goes. Into another pair's line: that line is
 *    cut back to before the cell, and this one goes through. Into another
 *    pair's stone, a blocked cell, across a wall, or past its own far stone:
 *    nothing.
 *  - Into a portal: the line goes in at one cell and comes out of the other,
 *    going on the same way, into the cell beyond it, in the one drag; the
 *    line's list has both portal cells between the cell before and the cell
 *    after, and no line ever ends on a portal. Backing over a portal takes
 *    the line back to before it. Another line already holding a portal's
 *    cells is cut back to before them, as for any cell. See `dragFinger` for
 *    what a finger over the board draws toward once a line has been through one.
 *  - Onto a bridge: only to go straight on (`steps.ts`); another line already
 *    going the same way over it is cut back, and a line never crosses itself.
 *    A bridge is in a line's list between the cells either side of it, and a
 *    line let go with its tip on a bridge ends before it. Pressing on a bridge
 *    draws nothing: two lines may be there.
 *
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, noLines } from "@johnmorrisdotca/tsunagi";
 * import type { Lines } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * const value: Lines = lines;
 * console.log(value);
 * ```
 */
export type Lines = readonly (readonly number[])[];

/** The initial lines rooted at each pair’s first endpoint.
 *
 * @param layout - The decoded native board and its rule settings.
 * @returns The initial lines rooted at each pair’s first endpoint.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, noLines } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(noLines(layout));
 * ```
 */
export function noLines(layout: LinkLayout): Lines {
  return layout.ends.map(() => []);
}

/** The pair whose line (or stone) holds each cell, `CELL_EMPTY` for none, `CELL_BLOCKED` where blocked, `CELL_BRIDGE` on a bridge (two lines may be there).
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @returns The pair whose line (or stone) holds each cell, `CELL_EMPTY` for none, `CELL_BLOCKED` where blocked, `CELL_BRIDGE` on a bridge (two lines may be there).
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, noLines, ownersOf } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(ownersOf(layout,lines));
 * ```
 */
export function ownersOf(layout: LinkLayout, lines: Lines): number[] {
  const owners = layout.cells.map((cell) => (cell === CELL_BLOCKED || cell === CELL_BRIDGE ? cell : cell >= 0 ? cell : CELL_EMPTY));
  lines.forEach((line, pair) => line.forEach((cell) => owners[cell] !== CELL_BRIDGE && (owners[cell] = pair)));
  return owners;
}

/** The pair going over a bridge each way, or -1: across (left to right) and down.
 *
 * @param lines - The native cell lists for every pair.
 * @param bridge - The zero-based bridge-cell index.
 * @returns The pair going over a bridge each way, or -1: across (left to right) and down.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, noLines, overBridge } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(overBridge(lines,5));
 * ```
 */
export function overBridge(lines: Lines, bridge: number): { across: number; down: number } {
  const out = { across: -1, down: -1 };
  lines.forEach((line, pair) => {
    const at = line.indexOf(bridge);
    if (at <= 0) return;
    if (Math.abs(bridge - line[at - 1]!) === 1) out.across = pair;
    else out.down = pair;
  });
  return out;
}

/** Whether a pair's line runs from one of its stones to the other.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @param pair - The zero-based pair index.
 * @returns Whether a pair's line runs from one of its stones to the other.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, joined, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const solvedLines = linesOfAnswer(layout,answer)!;
 * console.log(joined(layout,solvedLines,0));
 * ```
 */
export function joined(layout: LinkLayout, lines: Lines, pair: number): boolean {
  const line = lines[pair]!;
  const [a, b] = layout.ends[pair]!;
  return line.length >= 2 && ((line[0] === a && line[line.length - 1] === b) || (line[0] === b && line[line.length - 1] === a));
}

/** Solved: every pair joined, every open cell on a line, and every bridge gone over both ways.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @returns Solved: every pair joined, every open cell on a line, and every bridge gone over both ways.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { allJoined, decodeLayout, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const solvedLines = linesOfAnswer(layout,answer)!;
 * console.log(allJoined(layout,solvedLines));
 * ```
 */
export function allJoined(layout: LinkLayout, lines: Lines): boolean {
  if (!layout.ends.every((_, pair) => joined(layout, lines, pair))) return false;
  if (!ownersOf(layout, lines).every((owner) => owner !== CELL_EMPTY)) return false;
  return layout.cells.every((cell, at) => {
    if (cell !== CELL_BRIDGE) return true;
    const over = overBridge(lines, at);
    return over.across !== -1 && over.down !== -1;
  });
}

/**
 * The pairs not joined yet, for Check: every pair whose line does not run from
 * one of its marbles to the other — a line stopped beside its partner looks
 * joined and is not. Nothing about where any line should go.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @returns The pairs not joined yet, for Check: every pair whose line does not run from one of its marbles to the other — a line stopped beside its partner looks joined and is not. Nothing about where any line should go.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, noLines, unjoinedPairs } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * console.log(unjoinedPairs(layout,lines));
 * ```
 */
export function unjoinedPairs(layout: LinkLayout, lines: Lines): number[] {
  return layout.ends.map((_, pair) => pair).filter((pair) => !joined(layout, lines, pair));
}

/**
 * A level's answer drawn back as lines: each pair's cells, in order, from its
 * first marble to its second. How a solved level opens on its solved board.
 * Null for an answer that does not draw every pair as one unbroken line.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param answer - The native complete answer string or solved lines specified by the signature.
 * @returns A level's answer drawn back as lines: each pair's cells, in order, from its first marble to its second. How a solved level opens on its solved board. null for an answer that does not draw every pair as one unbroken line.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * console.log(linesOfAnswer(layout,answer));
 * ```
 */
export function linesOfAnswer(layout: LinkLayout, answer: string): Lines | null {
  const { size } = layout;
  if (answer.length !== size * size) return null;
  const steps = stepTable(layout);
  const out: number[][] = [];
  for (const [pair, [from, to]] of layout.ends.entries()) {
    const letter = PAIR_LETTERS[pair];
    const cells = [...answer].filter((char) => char === letter).length;
    // A search, not a walk: a line that runs beside itself leaves a cell two ways on. A bridge gone over is in the line between the cells either side of it.
    const line = [from];
    let counted = 1;
    const walk = (): boolean => {
      const at = line[line.length - 1]!;
      if (at === to) return counted === cells;
      for (const step of steps[at]!) {
        if (answer[step.to] !== letter || line.includes(step.to)) continue;
        // A portal's cells are the line's, and a portal is gone through once.
        if (step.through.some((cell) => answer[cell] !== letter || line.includes(cell))) continue;
        if (step.over !== -1) line.push(step.over);
        line.push(...step.through, step.to);
        counted += 1 + step.through.length;
        if (walk()) return true;
        counted -= 1 + step.through.length;
        line.length -= 1 + step.through.length;
        if (step.over !== -1) line.pop();
      }
      return false;
    };
    if (!walk()) return null;
    out.push(line);
  }
  return out;
}

/** How many open cells have a line through them or a stone on them, and how many there are: a bridge counts twice, once each way over it.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @returns How many open cells have a line through them or a stone on them, and how many there are: a bridge counts twice, once each way over it.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, filled, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const solvedLines = linesOfAnswer(layout,answer)!;
 * console.log(filled(layout,solvedLines));
 * ```
 */
export function filled(layout: LinkLayout, lines: Lines): { done: number; of: number } {
  const open = layout.cells.filter((cell) => cell !== CELL_BLOCKED && cell !== CELL_BRIDGE).length;
  const bridges = layout.cells.flatMap((cell, at) => (cell === CELL_BRIDGE ? [at] : []));
  const covered = new Set(lines.flat().filter((cell) => layout.cells[cell] !== CELL_BRIDGE));
  layout.cells.forEach((cell, at) => cell >= 0 && covered.add(at));
  const over = bridges.reduce((sum, bridge) => {
    const ways = overBridge(lines, bridge);
    return sum + (ways.across === -1 ? 0 : 1) + (ways.down === -1 ? 0 : 1);
  }, 0);
  return { done: covered.size + over, of: open + 2 * bridges.length };
}

/** The answer the lines make, in the answer's spelling (`encodeAnswer`).
 *
 * @param layout - The decoded native board and its rule settings.
 * @param lines - The native cell lists for every pair.
 * @returns The answer the lines make, in the answer's spelling (`encodeAnswer`).
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { answerOf, decodeLayout, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const solvedLines = linesOfAnswer(layout,answer)!;
 * console.log(answerOf(layout,solvedLines));
 * ```
 */
export function answerOf(layout: LinkLayout, lines: Lines): string {
  return encodeAnswer(ownersOf(layout, lines));
}

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
  if (layout.cells[tip] === CELL_BRIDGE && line.length >= 2 && cell - tip !== tip - line[line.length - 2]!) return lines;
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
    if (tip === cell || line.includes(cell) || layoutStep(layout, tip, cell) !== 0) return dragTo(layout, now, pair, cell);
    const [tr, tc] = [Math.floor(tip / size), tip % size];
    const [cr, cc] = [Math.floor(cell / size), cell % size];
    // On a square, along the row and then the column; on a hexagon, whichever of the six steps comes nearest.
    const step = layout.hex ? hexToward(size, tip, cell) : tc !== cc ? tip + Math.sign(cc - tc) : tip + Math.sign(cr - tr) * size;
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
export function dragFinger(layout: LinkLayout, lines: Lines, pair: number, finger: number, reach: Reach = NO_REACH): { lines: Lines; reach: Reach } {
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
  if (after === lines || portalCells(layout, now) === portalCells(layout, before) || now.length === 0) return { lines: after, reach };
  // A portal gone through or back over: the finger is over the end of the line from here.
  const tip = now[now.length - 1]!;
  return { lines: after, reach: { dr: Math.floor(tip / size) - Math.floor(finger / size), dc: (tip % size) - (finger % size) } };
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
  const onBridge = (line: readonly number[]) => layout !== undefined && line.length > 0 && layout.cells[line[line.length - 1]!] === CELL_BRIDGE;
  if (!lines.some((line) => line.length === 1 || onBridge(line))) return lines;
  return lines.map((line) => {
    const kept = onBridge(line) ? line.slice(0, -1) : line;
    return kept.length === 1 ? [] : kept;
  });
}

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
      out[cell] = by === -size ? "n" : by === 1 ? "e" : by === size ? "s" : by === -1 ? "w" : by === 1 - size ? "u" : "v";
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
