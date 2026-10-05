/**
 * THE 20×20, 25×25 AND 30×30 LEVELS, MADE ON A DESK: `node scripts/tsunagi-levels-huge.ts [size…]`.
 *
 * John, 2026-10-05: boards up to 30×30. They are made by taking clues away
 * (`src/reduce.ts`), not found by luck, and `scripts/tsunagi-reduce-pool.ts` makes the pools
 * this reads: boards of at most 82 lines, each proved to have exactly one answer by a
 * search started from its own answer (`countSolutionsOfLevel`) and measured. Then, as for
 * the sizes before it:
 *
 *  - `PLAIN` boards are taken evenly along the pool ordered by the measured difficulty
 *    (`difficulty.ts`), so a size runs from easy to hard, and the whole set is ordered by it;
 *  - each block's 15th and 16th are its twist, in this order (a short ladder, four blocks):
 *    WALLS (six blocked cells), WRAP, PORTALS (one, then three), and EXPLOSIONS on the
 *    board the slot would have had. No bridges: a bridge is a cell two lines cross, and the
 *    boards here are cut from lines that never cross; no waypoints, since a board of 36 lines
 *    or more has none (`stoneLetters`) and the boards here have 40 to 80;
 *  - the difficulty marks every level shows, and each twist's part in its lesson, are written
 *    to `levels/marks.data.ts` beside those of the sizes already there, which are kept.
 *
 * Nothing from 4×4 to 15×15 is touched: no level, no answer, no number.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { PAIR_LETTERS } from "../src/code.ts";
import { difficultyScores, measureLevel, orderByDifficulty, type LevelMeasure } from "../src/difficulty.ts";
import { TSUNAGI_BLOCK } from "../src/levelBlocks.ts";
import { twistRole } from "../src/ladder.ts";
import type { TwistRole } from "../src/ladder.types.ts";
import { TSUNAGI_MARKS, TSUNAGI_PORTAL_MARKS, TSUNAGI_ROLES } from "../src/levels/marks.data.ts";
import { marksFile } from "./tsunagi-marks-file.ts";
import { explosive } from "./tsunagi-twists.ts";
import type { ReducedPoolBoard } from "./tsunagi-reduce-pool.ts";

/** Levels a big size has: four blocks of sixteen. */
const WANTED = 64;

/** The sizes this makes. */
const SIZES = [20, 25, 30] as const;

type Level = readonly [string, string];

/** The first job of a size's plain pool whose lines wander: the 20×20 jobs before it were made at greed 1 alone, and their lines wind round the edge in spirals. */
const FIRST_VARIED_JOB: Readonly<Record<number, number>> = { 20: 200 };

function readPool(size: number, kind: string): ReducedPoolBoard[] {
  const file = `scripts/.tsunagi-pool/size${size}.${kind}.jsonl`;
  if (!existsSync(file)) return [];
  const seen = new Set<string>();
  const out: ReducedPoolBoard[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line === "") continue;
    const board = JSON.parse(line) as ReducedPoolBoard;
    if (seen.has(board.key) || (kind === "plain" && board.job < (FIRST_VARIED_JOB[size] ?? 0))) continue;
    seen.add(board.key);
    out.push(board);
  }
  // Job order, then the board's own key: the same whichever order the jobs finished in.
  return out.sort((a, b) => a.job - b.job || (a.key < b.key ? -1 : 1));
}

/** A pool board's measures, as `measureLevel` would make them: the solve is already in the pool. */
function measureOf(board: ReducedPoolBoard): LevelMeasure {
  const lengths = [...new Set([...board.answer].filter((char) => PAIR_LETTERS.includes(char)))].map((letter) => [...board.answer].filter((char) => char === letter).length);
  const cells = board.layout.split("|")[0]!;
  return {
    pairs: board.pairs,
    turns: board.turns,
    longest: Math.max(...lengths),
    empties: [...cells].filter((char) => char === ".").length,
    forcedShare: board.forced,
    nodes: board.nodes,
    branches: board.branches,
  };
}

/** The pool's boards, easiest first by the measured difficulty among them. */
function byDifficulty(boards: readonly ReducedPoolBoard[], size: number): ReducedPoolBoard[] {
  const scores = difficultyScores(boards.map(measureOf), size);
  return boards
    .map((board, at) => ({ board, score: scores[at]! }))
    .sort((a, b) => a.score - b.score || (a.board.key < b.board.key ? -1 : 1))
    .map(({ board }) => board);
}

function fileFor(size: number, levels: readonly Level[]): string {
  return [
    "/**",
    ` * TSUNAGI AT ${size}×${size}: ${levels.length} levels in blocks of 16, easiest first by the measured difficulty (\`difficulty.ts\`), each block's 15th and 16th its twist.`,
    " *",
    " * WRITTEN BY `node scripts/tsunagi-levels-huge.ts`, NEVER BY HAND, from the pool",
    " * `node scripts/tsunagi-reduce-pool.ts` makes. Each line is one level: its layout (a",
    " * character for each pair's two stones, `.` for an empty cell) and its one answer",
    " * (the character of the line through every cell). Every level is proved to have",
    " * exactly one answer by `levels.test.ts`, no two are the same board under a turn",
    " * or a mirror, and `difficulty.test.ts` holds the order to the measure.",
    " */",
    `export const TSUNAGI_${size}: readonly (readonly [string, string])[] = [`,
    ...levels.map(([layout, answer]) => `  ["${layout}", "${answer}"],`),
    "];",
    "",
  ].join("\n");
}

const asked = process.argv.slice(2).map(Number).filter((size) => (SIZES as readonly number[]).includes(size));
const marks: Record<number, string> = { ...TSUNAGI_MARKS };
const roles: Record<number, Record<number, TwistRole>> = { ...TSUNAGI_ROLES };
for (const size of asked.length > 0 ? asked : SIZES) {
  const started = performance.now();
  const used = new Set<string>();
  /** A pool's board at a place along it (0 easiest, 1 hardest), not yet used. */
  const take = (list: readonly ReducedPoolBoard[], at: number): ReducedPoolBoard => {
    const free = list.filter((board) => !used.has(board.key));
    if (free.length === 0) throw new Error(`${size}×${size}: a pool is empty or used up`);
    const board = free[Math.round(Math.min(1, Math.max(0, at)) * (free.length - 1))]!;
    used.add(board.key);
    return board;
  };
  const pool = (kind: string) => byDifficulty(readPool(size, kind), size);
  // The twists first, so the plain boards are chosen from what is left.
  const twist = {
    walls: pool("blocked"),
    wrap: pool("wrap"),
    portalsEasy: pool("portals1"),
    portalsHard: pool("portals3"),
  };
  const blocks = WANTED / TSUNAGI_BLOCK;
  // Block by block: walls, wrap, portals, then explosions on the slot's own plain boards.
  const placed = new Map<number, Level>();
  const teachTest: [ReducedPoolBoard[], ReducedPoolBoard[]][] = [
    [twist.walls, twist.walls],
    [twist.wrap, twist.wrap],
    [twist.portalsEasy, twist.portalsHard],
  ];
  teachTest.forEach(([teach, test], block) => {
    const a = take(teach, 0.1);
    const b = take(test, 0.7);
    placed.set(block * TSUNAGI_BLOCK + 14, [a.layout, a.answer]);
    placed.set(block * TSUNAGI_BLOCK + 15, [b.layout, b.answer]);
  });
  const plainPool = pool("plain");
  const plainSlots = Array.from({ length: WANTED }, (_, at) => at).filter((at) => !placed.has(at));
  const plain = plainSlots.map((_, index) => take(plainPool, index / (plainSlots.length - 1)));
  const plainOrdered = orderByDifficulty(plain.map((board) => [board.layout, board.answer] as const), size).map((at) => [plain[at]!.layout, plain[at]!.answer] as const);
  const levels: Level[] = Array.from({ length: WANTED }, () => ["", ""] as Level);
  plainSlots.forEach((slot, index) => (levels[slot] = plainOrdered[index]!));
  for (const [slot, level] of placed) levels[slot] = level;
  // The last block's twist is an explosion on the board the slot has: a boom a clean solve meets once, then a blast.
  for (const [offset, role] of [[14, "teach"], [15, "test"]] as const) {
    const slot = (blocks - 1) * TSUNAGI_BLOCK + offset;
    const [layout, answer] = levels[slot]!;
    levels[slot] = [explosive(layout, size, role).layout, answer];
  }
  writeFileSync(`src/levels/size${size}.data.ts`, fileFor(size, levels));
  const scores = difficultyScores(levels.map(([layout, answer]) => measureLevel(layout, answer, size)!), size);
  marks[size] = scores.map((score) => String(Math.min(5, 1 + Math.floor(score / 20)))).join("");
  const layouts = levels.map(([layout]) => layout);
  roles[size] = Object.fromEntries(layouts.flatMap((_, at) => {
    const role = twistRole(layouts, at + 1);
    return role === null ? [] : [[at + 1, role]];
  }));
  console.log(`${size}×${size}: ${levels.length} levels from a plain pool of ${plainPool.length}, ${Math.round((performance.now() - started) / 1000)} s`);
}
writeFileSync("src/levels/marks.data.ts", marksFile(marks, roles, { ...TSUNAGI_PORTAL_MARKS }));
