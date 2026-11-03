import { CELL_BLOCKED, CELL_BRIDGE, CELL_EMPTY, encodeAnswer, type LinkLayout, PAIR_LETTERS } from "./code.ts";
import { stepTable } from "./steps.ts";

export { decodeLines, encodeLines, linesCodeFits } from "./lines-code.ts";
export type { Reach } from "./lines-drag.ts";
export { dragFinger, dragThrough, dragTo, letGo, NO_REACH, pressAt, withoutPortalTail } from "./lines-drag.ts";

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
  const owners = layout.cells.map((cell) =>
    cell === CELL_BLOCKED || cell === CELL_BRIDGE ? cell : cell >= 0 ? cell : CELL_EMPTY,
  );
  lines.forEach((line, pair) => {
    line.forEach((cell) => {
      if (owners[cell] !== CELL_BRIDGE) owners[cell] = pair;
    });
  });
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
  return (
    line.length >= 2 &&
    ((line[0] === a && line[line.length - 1] === b) || (line[0] === b && line[line.length - 1] === a))
  );
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
  layout.cells.forEach((cell, at) => {
    cell >= 0 && covered.add(at);
  });
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
