import { CAPITAL_PAIRS, CELL_BLOCKED, CELL_EMPTY, decodeLayout, encodeAnswer, layoutNeighbours, PAIR_LETTERS, portalsAreAmbiguous, stepBetween, wrappedStep, type LinkLayout } from "./code.ts";
import { layoutOf, randomFilling, symmetryKey, turnsIn, type FillingStyle, type LinkCandidate } from "./generate.ts";
import type { Random } from "./random.ts";
import { countSolutionsOfLevel } from "./solve.ts";
import { countSolutionsSat } from "./solveSat.ts";

/**
 * MAKING BIG BOARDS BY TAKING CLUES AWAY. A big board is not found by luck: a
 * filling with as many lines as a 30×30 board of one answer needs almost never
 * has one answer, and mending it (`repairedCandidate`) means searching for a
 * second answer, which on a board that size takes longer than anyone waits.
 *
 * So this goes the other way, as a Sudoku maker does. Start from a filling cut
 * into many short lines, which has one answer for want of any room to have two,
 * and join neighbouring lines back into longer ones, one at a time, keeping each
 * join only while the solver can still prove the board has one answer within a
 * budget of dead ends. What is left is a board whose proof is cheap by
 * construction, with as few lines as that budget lets it have: at 30×30,
 * 3,000 dead ends leave about 75 lines and 20,000 about 52, and each board is
 * made in seconds to a minute.
 *
 * It makes boards with walls of blocked cells, boards that wrap, waypoints and
 * portals (`withPortals`); the board is then measured as every level is, and
 * kept only if it has few enough lines to be written down (`PAIR_LETTERS`).
 * Only the level scripts call this.
 */

/** The most lines a board can have: as many as there are characters to name them. */
export const MOST_PAIRS = PAIR_LETTERS.length;

/** The shortest a line's piece may be, in cells, as in `generate.ts`. */
const SHORTEST = 3;

export type ReduceOptions = {
  /** Dead ends the solver may meet proving one join leaves the board with one answer. Default 20,000. */
  budget?: number;
  /** Stop joining when this many lines are left. Default one: join while a proof is cheap enough. */
  fewest?: number;
  /** The most lines the board may end with, else none is made. Default `MOST_PAIRS`. */
  most?: number;
  /** How long a piece of line the cutting starts from is, in cells. Default 4. */
  piece?: number;
  /** How far a line may grow before it is cut, in cells: the longest a line of the board can be. Default three times the side. */
  longest?: number;
  /** A board whose edges join. */
  wrap?: boolean;
  /** How many portals to put in. */
  portals?: number;
  /** How many waypoints to put in. */
  waypoints?: number;
  /** Cells no line enters. */
  blocked?: ReadonlySet<number>;
  /** How many blocked cells to scatter, none beside another, when `blocked` is not given. */
  blockedCount?: number;
  /** How eagerly the lines the board is cut from take their tightest way on (`FillingStyle`). Default 1. */
  greed?: number;
  /** Dead ends the measuring solve may meet before the board is dropped. Default 200,000. */
  measure?: number;
};

/** What a made board has besides its lines. */
export type ReducedCandidate = LinkCandidate & { portals: number; waypoints: number; wrap: boolean; blocked: number };

/** A line's cell, one step `by` on (-1, +1, -size, +size), across the join where it wraps; -1 off the edge. */
function stepOf(size: number, wrap: boolean, at: number, by: number): number {
  if (wrap) return wrappedStep(size, at, by);
  const next = at + by;
  if (next < 0 || next >= size * size) return -1;
  return Math.abs(by) === 1 && Math.floor(next / size) !== Math.floor(at / size) ? -1 : next;
}

/** Whether every line of a filling is clean on the board's own steps: no two of its cells beside each other that are not neighbours in it, nor a portal's two ends joined other ways. */
function tidy(layout: LinkLayout, lines: readonly (readonly number[])[]): boolean {
  const around = layoutNeighbours(layout);
  for (const line of lines) {
    const place = new Map(line.map((cell, at) => [cell, at] as const));
    for (const [at, cell] of line.entries()) {
      for (const next of around[cell]!) {
        const far = place.get(next);
        if (far === undefined || layout.portals.has(cell) || layout.portals.has(next)) continue;
        if (Math.abs(far - at) !== 1) return false;
      }
    }
  }
  return true;
}

/**
 * A filling with portals put in: each portal is made by joining two lines into
 * one that goes into a ring and out of another, and the two cells it takes are
 * the portal. Where line A runs `… a, P1, …` and line B runs `… P2, b …` with
 * b on from P2 the way P1 is on from a, a new line runs A up to P1, the portal,
 * and B on from b; what is left of A after P1 and of B before P2 are lines of
 * their own, or nothing. Null where `count` portals cannot be made.
 */
export function withPortals(size: number, paths: readonly number[][], random: Random, count: number, wrap: boolean): { paths: number[][]; pairs: [number, number][] } | null {
  const total = size * size;
  let lines = paths.map((path) => [...path]);
  const pairs: [number, number][] = [];
  const base: LinkLayout = { size, cells: new Array<number>(total).fill(CELL_EMPTY), ends: [], walls: new Set(), waypoints: new Map(), wrap, portalPairs: [], portals: new Map(), hex: false, sparse: false, strokes: null, explosions: null };
  for (let made = 0; made < count; made += 1) {
    let done = false;
    for (let attempt = 0; attempt < 300 && !done; attempt += 1) {
      const aLine = Math.floor(random() * lines.length);
      const a = [...lines[aLine]!];
      if (random() < 0.5) a.reverse();
      if (a.length < 2) continue;
      const at = 1 + Math.floor(random() * (a.length - 1));
      const [before, p1] = [a[at - 1]!, a[at]!];
      const by = stepBetween(size, before, p1, wrap);
      if (by === 0) continue;
      // A line with two cells in a row going the same way, away from line A.
      const found: { line: number; reversed: boolean; at: number }[] = [];
      lines.forEach((line, each) => {
        if (each === aLine) return;
        for (const reversed of [false, true]) {
          const walked = reversed ? [...line].reverse() : line;
          for (let index = 0; index + 1 < walked.length; index += 1) if (stepOf(size, wrap, walked[index]!, by) === walked[index + 1]) found.push({ line: each, reversed, at: index });
        }
      });
      if (found.length === 0) continue;
      const pick = found[Math.floor(random() * found.length)]!;
      const bLine = lines[pick.line]!;
      const b = pick.reversed ? [...bLine].reverse() : [...bLine];
      const p2 = b[pick.at]!;
      const headOfB = b.slice(0, pick.at);
      const tailOfA = a.slice(at + 1);
      const joined = [...a.slice(0, at), p1, p2, ...b.slice(pick.at + 1)];
      // What is left of each is a line of its own, or nothing.
      if ((headOfB.length > 0 && headOfB.length < SHORTEST) || (tailOfA.length > 0 && tailOfA.length < SHORTEST)) continue;
      const chosen = [...pairs, [Math.min(p1, p2), Math.max(p1, p2)] as [number, number]].sort((x, y) => x[0] - y[0]);
      const rest = lines.filter((_, each) => each !== aLine && each !== pick.line);
      const next = [...rest, joined, ...(headOfB.length > 0 ? [headOfB] : []), ...(tailOfA.length > 0 ? [tailOfA] : [])];
      const portals = new Map<number, number>();
      for (const [x, y] of chosen) {
        portals.set(x, y);
        portals.set(y, x);
      }
      const layout: LinkLayout = { ...base, portalPairs: chosen, portals };
      // No two portal cells beside each other, and every line clean.
      const around = layoutNeighbours(layout);
      if ([...portals.keys()].some((cell) => around[cell]!.some((next) => portals.has(next)))) continue;
      if (portalsAreAmbiguous(layout) || !tidy(layout, next)) continue;
      lines = next;
      pairs.push([Math.min(p1, p2), Math.max(p1, p2)]);
      done = true;
    }
    if (!done) return null;
  }
  return { paths: lines, pairs: pairs.sort((x, y) => x[0] - y[0]) };
}

/** `count` blocked cells scattered over a board, never two beside each other, never on an edge of a board that does not wrap, so that every line has room to go round. */
function scattered(size: number, wrap: boolean, count: number, random: Random): Set<number> {
  const out = new Set<number>();
  const around = layoutNeighbours({ size, cells: [], ends: [], walls: new Set(), waypoints: new Map(), wrap, portalPairs: [], portals: new Map(), hex: false, sparse: false, strokes: null, explosions: null });
  for (let tries = 0; tries < count * 50 && out.size < count; tries += 1) {
    const cell = Math.floor(random() * size * size);
    const edge = !wrap && (cell < size || cell >= size * (size - 1) || cell % size === 0 || cell % size === size - 1);
    if (!edge && !out.has(cell) && !around[cell]!.some((next) => out.has(next))) out.add(cell);
  }
  return out;
}

type Piece = { path: number; cells: number[] };

/**
 * One board made by taking clues away, or null. The filling's lines are cut into
 * pieces of about `piece` cells and joined again at random while one answer can
 * be proved within `budget` dead ends; see the top of this file.
 */
export function reducedCandidate(size: number, random: Random, options: ReduceOptions = {}): ReducedCandidate | null {
  const total = size * size;
  const budget = options.budget ?? 20_000;
  const wrap = options.wrap === true;
  // A board of thirty-six lines or more has no waypoints (`stoneLetters`).
  const most = Math.min(options.most ?? MOST_PAIRS, (options.waypoints ?? 0) > 0 ? CAPITAL_PAIRS - 1 : MOST_PAIRS);
  const blocked = options.blocked ?? scattered(size, wrap, options.blockedCount ?? 0, random);
  const style: FillingStyle = { greed: options.greed ?? 1 };
  let filling: number[][] | null = null;
  for (let tries = 0; tries < 40 && filling === null; tries += 1) filling = randomFilling(size, random, options.longest ?? size * 3, blocked, wrap, false, style);
  if (filling === null) return null;
  let portalPairs: [number, number][] = [];
  if ((options.portals ?? 0) > 0) {
    const made = withPortals(size, filling, random, options.portals!, wrap);
    if (made === null) return null;
    filling = made.paths;
    portalPairs = made.pairs;
  }
  const portals = new Map<number, number>();
  for (const [a, b] of portalPairs) {
    portals.set(a, b);
    portals.set(b, a);
  }
  // Waypoints sit on cells of a line that no cut will make a marble: a cell deep in a line, never beside a portal or another waypoint.
  const marked = new Set<number>();
  const around = layoutNeighbours({ size, cells: [], ends: [], walls: new Set(), waypoints: new Map(), wrap, portalPairs: [], portals: new Map(), hex: false, sparse: false, strokes: null, explosions: null });
  const interior = filling.flatMap((line) => line.slice(1, -1).filter((cell) => !portals.has(cell) && !around[cell]!.some((next) => portals.has(next))));
  for (let each = 0; each < interior.length * 4 && marked.size < (options.waypoints ?? 0); each += 1) {
    const cell = interior[Math.floor(random() * interior.length)]!;
    if (!marked.has(cell) && !around[cell]!.some((next) => marked.has(next))) marked.add(cell);
  }
  if (marked.size < (options.waypoints ?? 0)) return null;
  // A cut may fall between two cells that are neither a portal's nor a waypoint's, nor beside one: those stay inside a line.
  const sealed = new Set<number>([...portals.keys(), ...marked]);
  const mayCutBefore = (line: readonly number[], index: number): boolean => !sealed.has(line[index - 1]!) && !sealed.has(line[index]!);
  let pieces: Piece[] = [];
  filling.forEach((line, path) => {
    let from = 0;
    while (from < line.length) {
      let end = Math.min(line.length, from + (options.piece ?? 4));
      // The next cut must leave at least a piece's worth after it, and not fall beside a portal or on a waypoint.
      while (end < line.length && (line.length - end < SHORTEST || !mayCutBefore(line, end))) end += 1;
      pieces.push({ path, cells: line.slice(from, end) });
      from = end;
    }
  });

  const layoutFor = (each: readonly Piece[]): LinkLayout => {
    const cells = new Array<number>(total).fill(CELL_EMPTY);
    for (const cell of blocked) cells[cell] = CELL_BLOCKED;
    const waypoints = new Map<number, number>();
    each.forEach((piece, pair) => {
      cells[piece.cells[0]!] = pair;
      cells[piece.cells[piece.cells.length - 1]!] = pair;
      for (const cell of piece.cells) if (marked.has(cell)) waypoints.set(cell, pair);
    });
    return { size, cells, ends: each.map((piece) => [piece.cells[0]!, piece.cells[piece.cells.length - 1]!] as [number, number]), walls: new Set(), waypoints, wrap, portalPairs, portals, hex: false, sparse: false, strokes: null, explosions: null };
  };
  const unique = (each: readonly Piece[], spend: number): boolean => {
    const layout = layoutFor(each);
    const proved = countSolutionsSat(layout, 2, spend, each.map((piece) => piece.cells), "binary");
    return !proved.gaveUp && proved.count === 1;
  };
  // The cut pieces must themselves make a board of one answer, or there is nothing to take clues from.
  if (!unique(pieces, budget * 4)) return null;

  const needed = new Set<string>();
  const keyOf = (a: Piece, b: Piece) => `${a.cells[0]}-${b.cells[0]}`;
  const fewest = options.fewest ?? 1;
  for (let guard = 0; guard < total * 4 && pieces.length > fewest; guard += 1) {
    const candidates: number[] = [];
    for (let at = 0; at + 1 < pieces.length; at += 1) if (pieces[at]!.path === pieces[at + 1]!.path && !needed.has(keyOf(pieces[at]!, pieces[at + 1]!))) candidates.push(at);
    if (candidates.length === 0) break;
    const at = candidates[Math.floor(random() * candidates.length)]!;
    const joined: Piece = { path: pieces[at]!.path, cells: [...pieces[at]!.cells, ...pieces[at + 1]!.cells] };
    const trial = [...pieces.slice(0, at), joined, ...pieces.slice(at + 2)];
    if (unique(trial, budget)) pieces = trial;
    else needed.add(keyOf(pieces[at]!, pieces[at + 1]!));
  }
  if (pieces.length > most) return null;

  const { layout, answer } = layoutOf(size, pieces.map((piece) => piece.cells), { blocked, wrap, waypoints: marked, portals: portalPairs });
  const decoded = decodeLayout(layout, size);
  if (decoded === null) return null;
  // Measured as the levels' own tests will measure it: from the answer, which is how a level is proved.
  const solved = countSolutionsOfLevel(decoded, answer, 2, options.measure ?? 200_000);
  if (solved.gaveUp || solved.count !== 1 || encodeAnswer(solved.solution!) !== answer) return null;
  return {
    layout,
    answer,
    pairs: decoded.ends.length,
    nodes: solved.nodes,
    branches: solved.branches,
    turns: turnsIn(answer, decoded),
    key: symmetryKey(layout, size),
    portals: portalPairs.length,
    waypoints: marked.size,
    wrap,
    blocked: blocked.size,
  };
}
