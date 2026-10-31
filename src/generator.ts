import type { TsunagiBoard } from "./board.ts";
import { checkTsunagiAnswer } from "./check.ts";
import { decodeLayout, encodeAnswer, type LinkLayout } from "./code.ts";
import { absorb, type LinkCandidate, layoutOf, symmetryKey, turnsIn } from "./generate.ts";
import type { Random } from "./random.ts";
import { withPortals } from "./reduce.ts";
import { countSolutions, SAT_BINARY_FROM_SIZE, SAT_FROM_SIZE, type SolveCount } from "./solve.ts";
import { countSolutionsSat } from "./solveSat.ts";
import { withBridges } from "./twists.ts";

/**
 * ONE GENERATOR FOR EVERY BOARD (John, 2026-10-01): "come up with a smart way to generate everything". It works on a
 * board as a graph (`board.ts`), so squares, oblongs, honeycombs, boards whose edges join and boards of any outline are
 * all the same code, at every size from 3×3 up, and the twists are planted on what it fills:
 *
 *  1. FILL the board with one winding path, cut into lines as it goes (`windingLines`). The path grows from its tip by
 *     the tightest way on; when the line it is drawing would touch itself or has run long enough it is cut there and
 *     goes on from a cell beside the tip, as the next line.
 *  2. PLANT what was asked for on those lines: marked warps (portals), bridges, waypoints.
 *  3. PROVE the board has one answer, with the solver every level is proved by (`countSolutions`).
 *  4. MEND a second answer by adding a pair: the line through a cell the two answers disagree on is cut there, which
 *     adds a pair of stones the second answer cannot honour, and the board is proved again.
 *
 * WHY THE PATH IS CUT AS IT GROWS, and not filled first and cut after. A path made first through every cell runs beside
 * itself almost everywhere, and a line may not (a solve of it could not be read back). Measured on 15×15 boards on
 * 2026-10-31: a whole path cut afterwards made 33 lines however it was shaken, where one cut as it grows made 15, and
 * mending took those to 11 to 22, each proved in under a second. Before this, boards of at most sixteen lines at 13×13
 * to 15×15 came only from pools run for hours on a desk.
 *
 * Imports carry their `.ts` so a level script can run this under plain node.
 */

/** How short a line may be: two stones side by side are a line with nothing to think about. */
const SHORTEST_LINE = 3;

/** How a board's lines are grown and how it is proved, every part with a default, and the twists to plant on it.
 *
 * @example
 * ```ts
 * import type { GeneratorOptions } from "@johnmorrisdotca/tsunagi";
 *
 * const value: GeneratorOptions = {longest:30,budget:2000,warps:1};
 * console.log(value);
 * ```
 */
export type GeneratorOptions = {
  /** The longest a line may grow, in cells. Default three times the board's longer side. */
  longest?: number;
  /** The most lines the board may end with, else this path is dropped for another. */
  most?: number;
  /** What one proof may spend before this path is dropped, so that a hard board costs a retry and not a long wait: 20,000 positions to 12×12, and from 13×13, on a honeycomb and with warps 3,000 dead ends. */
  budget?: number;
  /** How many times a board with two answers is mended before this path is dropped. Default 60. */
  mends?: number;
  /** How many paths are tried before the generator says it found nothing. Default 30. */
  tries?: number;
  /** How many marked warps (portals) to plant. Not on a honeycomb. */
  warps?: number;
  /** How many bridges to plant. Not on a honeycomb, nor with warps. */
  bridges?: number;
  /** How many waypoints to plant. */
  waypoints?: number;
};

type Around = readonly (readonly number[])[];

/** A way on by the tightest cell, or now and then any, so that it fills without always filling the same way. */
function pickWay(ways: readonly number[], room: (at: number) => number, random: Random): number {
  if (random() >= 0.85) return ways[Math.floor(random() * ways.length)]!;
  const least = Math.min(...ways.map(room));
  const tight = ways.filter((next) => room(next) === least);
  return tight[Math.floor(random() * tight.length)]!;
}

/**
 * Every cell of the board in lines of at least three cells, none beside itself: one winding path, cut as it grows. When
 * a line stops, the next starts beside its tip if a cell is free there, and otherwise in the tightest place left. A piece
 * too short to be a line is handed to a line beside it; failing that the last few lines are taken back and grown again.
 * Null where that did not settle.
 *
 * @param board - The board as a graph.
 * @param random - A reproducible random source returning values in [0,1).
 * @param longest - The longest a line may grow, in cells.
 * @returns The lines, as lists of cells, or null.
 * @example
 * ```ts
 * import { seededRandom, squareBoard, windingLines } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(windingLines(squareBoard(5),seededRandom(42),15)?.flat().length);
 * ```
 */
export function windingLines(board: TsunagiBoard, random: Random, longest: number): number[][] | null {
  const { around } = board;
  const owner = new Int16Array(board.size * board.size).fill(-1);
  // A closed cell belongs to no line: marked with an owner no line has.
  for (const cell of board.closed) owner[cell] = 32_000;
  const lines: number[][] = [];
  let left = board.cells.length;
  let retreats = 400;
  let tip = -1;
  const room = (at: number): number => {
    let count = 0;
    for (const next of around[at]!) if (owner[next] === -1) count += 1;
    return count;
  };
  // Whether `cell` can follow `from` on line `id` without the line touching itself.
  const fits = (id: number, from: number, cell: number): boolean =>
    owner[cell] === -1 && around[cell]!.every((next) => next === from || owner[next] !== id);
  while (left > 0) {
    // Beside the tip, as one path goes on; or, where the path has shut itself in, wherever is tightest.
    const beside = tip === -1 ? [] : around[tip]!.filter((next) => owner[next] === -1);
    let start: number;
    if (beside.length > 0) start = pickWay(beside, room, random);
    else {
      const empty = board.cells.filter((cell) => owner[cell] === -1);
      start = pickWay(empty, room, () => random() * 0.85);
    }
    const id = lines.length;
    const line = [start];
    owner[start] = id;
    const want = SHORTEST_LINE + Math.floor(random() * (longest - SHORTEST_LINE + 1));
    while (line.length < want) {
      const at = line[line.length - 1]!;
      const ways = around[at]!.filter((next) => fits(id, at, next));
      if (ways.length === 0) break;
      const pick = pickWay(ways, room, random);
      owner[pick] = id;
      line.push(pick);
    }
    if (line.length >= SHORTEST_LINE) {
      lines.push(line);
      left -= line.length;
      tip = line[line.length - 1]!;
      continue;
    }
    // Too short to be a line: hand its cells to a line beside it, or take back the last few and grow them again.
    for (const cell of line) owner[cell] = -1;
    if (absorb(line, lines, owner, around)) {
      left -= line.length;
      tip = -1;
      continue;
    }
    if (retreats <= 0) return null;
    retreats -= 1;
    tip = -1;
    const back = Math.min(lines.length, 1 + Math.floor(random() * 3));
    for (let each = 0; each < back; each += 1) {
      const taken = lines.pop()!;
      left += taken.length;
      for (const cell of taken) owner[cell] = -1;
    }
  }
  return lines;
}

/** The lines with the one through `cell` cut in two there, each half at least a line long and no cut beside a sealed cell; null where no such cut is. */
function cutAt(lines: readonly number[][], cell: number, sealed: ReadonlySet<number>): number[][] | null {
  const at = lines.findIndex((line) => line.includes(cell));
  if (at === -1) return null;
  const line = lines[at]!;
  const index = line.indexOf(cell);
  for (const cut of [index + 1, index]) {
    const [first, second] = [line.slice(0, cut), line.slice(cut)];
    if (first.length < SHORTEST_LINE || second.length < SHORTEST_LINE) continue;
    if (sealed.has(line[cut - 1]!) || sealed.has(line[cut]!)) continue;
    return [...lines.slice(0, at), first, second, ...lines.slice(at + 1)];
  }
  return null;
}

/** Waypoints on cells deep inside the lines, away from everything sealed and each other: chosen before any cut, so that none can land on a stone. Null where there is not room. */
function plantedWaypoints(
  lines: readonly number[][],
  around: Around,
  sealed: ReadonlySet<number>,
  want: number,
  random: Random,
): Set<number> | null {
  const marked = new Set<number>();
  const deep = lines.flatMap((line) =>
    line.slice(1, -1).filter((cell) => !sealed.has(cell) && !around[cell]!.some((next) => sealed.has(next))),
  );
  for (let each = 0; each < deep.length * 4 && marked.size < want; each += 1) {
    const cell = deep[Math.floor(random() * deep.length)]!;
    if (!marked.has(cell) && !around[cell]!.some((next) => marked.has(next))) marked.add(cell);
  }
  return marked.size === want ? marked : null;
}

/**
 * One level for any board, proved to have exactly one answer, or null where this seed found none in its tries. Null is an
 * honest answer: nothing here returns a board it could not prove.
 *
 * @param board - The board as a graph (`squareBoard`, `oblongBoard`, `hexagonBoard`, `tallHexagonBoard`, `shapedBoard`).
 * @param random - A reproducible random source returning values in [0,1).
 * @param options - How its lines run, what the proof may spend, and the twists to plant.
 * @returns A candidate proved to have one answer, or null.
 * @example
 * ```ts
 * import { generateTsunagi, seededRandom, squareBoard } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(generateTsunagi(squareBoard(5),seededRandom(42))?.layout);
 * ```
 */
export function generateTsunagi(
  board: TsunagiBoard,
  random: Random,
  options: GeneratorOptions = {},
): LinkCandidate | null {
  const { size, around, wrap, hex, shape } = board;
  // A honeycomb's six ways lose the plain search at any size, as a big square's four do: the solver that learns from its dead ends is the one for it.
  const learns = hex || size >= SAT_FROM_SIZE || (options.warps ?? 0) > 0;
  const budget = options.budget ?? (learns ? 3_000 : 20_000);
  const longest = options.longest ?? 3 * Math.max(1, Math.ceil(Math.sqrt(board.cells.length)));
  const { most } = options;
  // A twist that asks for a square's straight lines has no place on a honeycomb, whatever the seed.
  if (hex && ((options.warps ?? 0) > 0 || (options.bridges ?? 0) > 0)) return null;
  if ((options.warps ?? 0) > 0 && (options.bridges ?? 0) > 0) return null;

  for (let attempt = 0; attempt < (options.tries ?? 30); attempt += 1) {
    let lines = windingLines(board, random, longest);
    if (lines === null) continue;
    let portals: readonly (readonly [number, number])[] = [];
    let bridges = new Set<number>();
    if ((options.warps ?? 0) > 0) {
      const made = withPortals(size, lines, random, options.warps!, wrap);
      if (made === null) continue;
      lines = made.paths;
      portals = made.pairs;
    }
    if ((options.bridges ?? 0) > 0) {
      const made = withBridges(size, lines, random, options.bridges!);
      if (made === null) continue;
      lines = made.paths;
      bridges = made.bridges;
    }
    const sealed = new Set<number>([...bridges, ...portals.flat()]);
    const waypoints = plantedWaypoints(lines, around, sealed, options.waypoints ?? 0, random);
    if (waypoints === null) continue;
    for (const cell of waypoints) sealed.add(cell);
    const extras = {
      blocked: board.closed,
      hex,
      shape,
      wrap,
      portals,
      bridges,
      waypoints,
    };

    for (let round = 0; round <= (options.mends ?? 60); round += 1) {
      if (most !== undefined && lines.length > most) break;
      const { layout, answer } = layoutOf(size, lines, extras);
      const decoded: LinkLayout | null = decodeLayout(layout, size);
      if (decoded === null) break;
      // Started from the lines it was made from, so the answer is found at once and what it spends is proving there is no other.
      const solved: SolveCount = learns
        ? countSolutionsSat(
            decoded,
            2,
            budget,
            lines,
            size >= SAT_BINARY_FROM_SIZE || portals.length > 0 ? "binary" : "one-hot",
          )
        : countSolutions(decoded, 2, budget);
      if (solved.gaveUp) break;
      if (solved.count === 1) {
        // The solver's one answer is the one it was made from, and the check every solve is put through accepts it.
        if (encodeAnswer(solved.solution!) !== answer || !checkTsunagiAnswer(size, layout, answer).ok) break;
        return {
          layout,
          answer,
          pairs: decoded.ends.length,
          nodes: solved.nodes,
          branches: solved.branches,
          turns: turnsIn(answer, decoded),
          key: symmetryKey(layout, size),
        };
      }
      const other = solved.solutions.map(encodeAnswer).find((each) => each !== answer);
      if (other === undefined) break;
      const differ = [...other].flatMap((char, at) => (char !== answer[at] ? [at] : []));
      let mended: number[][] | null = null;
      for (let left = differ.length; left > 0 && mended === null; left -= 1)
        mended = cutAt(lines, differ.splice(Math.floor(random() * left), 1)[0]!, sealed);
      if (mended === null) break;
      lines = mended;
    }
  }
  return null;
}
