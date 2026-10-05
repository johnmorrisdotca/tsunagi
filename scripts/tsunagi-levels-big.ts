/**
 * THE 13×13, 14×14 AND 15×15 LEVELS, MADE ON A DESK: `node scripts/tsunagi-levels-big.ts [size…]`.
 *
 * John, 2026-10-01: "why is tsunagi missing the larger levels that went up to
 * 15x15?" 12×12 was the ceiling because the search that proved a board has one
 * answer (`solve.ts`) ran out of positions on nearly every board of a size
 * above it; `solveSat.ts` learns from its dead ends instead, and from 13×13
 * `countSolutions` is that. This script turns what it found into levels.
 *
 * It reads the pools made in parallel by `scripts/tsunagi-pool.ts` — boards
 * of at most sixteen lines, each proved to have exactly one answer and
 * measured — and, from `POOL_JOBS`, only the jobs recorded here, so the same
 * seeds always give the same levels. Then, as for the sizes before it:
 *
 *  - `WANTED` plain boards are taken evenly along the pool ordered by the
 *    measured difficulty (`difficulty.ts`), so a size runs from easy to hard,
 *    and the whole set is ordered by it, easiest first;
 *  - each block's 15th and 16th are its twist (`tsunagi-twists.ts`): bridges,
 *    walls, waypoints and wrap, explosions, a stroke limit and a hexagon, from
 *    the twist pools, every board of them proved to have one answer;
 *  - the difficulty marks every level shows are written to `levels/marks.data.ts`
 *    beside those of the sizes already there, which are read and kept as they were.
 *
 * Nothing from 4×4 to 12×12 is touched: no level, no answer, no number.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { PAIR_LETTERS } from "../src/code.ts";
import { difficultyScores, measureLevel, orderByDifficulty, type LevelMeasure } from "../src/difficulty.ts";
import { twistRole } from "../src/ladder.ts";
import type { TwistRole } from "../src/ladder.types.ts";
import { TSUNAGI_MARKS, TSUNAGI_PORTAL_MARKS, TSUNAGI_ROLES } from "../src/levels/marks.data.ts";
import { marksFile } from "./tsunagi-marks-file.ts";
import type { TwistCandidate } from "../src/twists.ts";
import { KINDS, withTwists, type Kind } from "./tsunagi-twists.ts";
import type { PoolBoard } from "./tsunagi-pool.ts";

/** Levels a size has: eight blocks of sixteen, as 12×12 has. */
const WANTED = 128;

/** How many jobs of each pool this size's levels are made from (`tsunagi-pool.ts <size> <kind> <jobs>`). */
const POOL_JOBS: Record<number, { plain: number; twists: number }> = {
  13: { plain: 150, twists: 50 },
  14: { plain: 150, twists: 50 },
  15: { plain: 300, twists: 50 },
};

type Level = readonly [string, string];

function readPool<T extends PoolBoard>(size: number, kind: string, jobs: number): T[] {
  const file = `scripts/.tsunagi-pool/size${size}.${kind}.jsonl`;
  if (!existsSync(file)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line === "") continue;
    const board = JSON.parse(line) as T;
    if (board.job >= jobs || seen.has(board.key)) continue;
    seen.add(board.key);
    out.push(board);
  }
  // Job order, then the board's own key: the same whichever order the jobs finished in.
  return out.sort((a, b) => a.job - b.job || (a.key < b.key ? -1 : 1));
}

/** A pool board's measures, as `measureLevel` would make them: the solve is already in the pool. */
function measureOf(board: PoolBoard): LevelMeasure {
  const lengths = [...new Set([...board.answer].filter((char) => PAIR_LETTERS.includes(char)))].map((letter) => [...board.answer].filter((char) => char === letter).length);
  const cells = board.layout.split("|")[0]!;
  return {
    pairs: board.pairs,
    turns: board.turns,
    longest: Math.max(...lengths),
    empties: [...cells].filter((char) => char === "." || (char >= "a" && char <= "z")).length,
    forcedShare: board.forced,
    nodes: board.nodes,
    branches: board.branches,
  };
}

/** The pool's boards, easiest first by the measured difficulty among them. */
function byDifficulty<T extends PoolBoard>(boards: readonly T[], size: number): T[] {
  const scores = difficultyScores(boards.map((board) => measureOf(board)), size);
  return boards.map((board, at) => ({ board, score: scores[at]! })).sort((a, b) => a.score - b.score || (a.board.key < b.board.key ? -1 : 1)).map(({ board }) => board);
}

function fileFor(size: number, levels: readonly Level[]): string {
  return [
    "/**",
    ` * TSUNAGI AT ${size}×${size}: ${levels.length} levels in blocks of 16, easiest first by the measured difficulty (\`difficulty.ts\`), each block's 15th and 16th its twist where one could be placed.`,
    " *",
    " * WRITTEN BY `node scripts/tsunagi-levels-big.ts`, NEVER BY HAND, from the pool",
    " * `node scripts/tsunagi-pool.ts` makes. Each line is one level: its layout (a",
    " * letter for each pair's two stones, `.` for an empty cell) and its one answer",
    " * (the letter of the line through every cell). Every level is proved to have",
    " * exactly one answer by `levels.test.ts`, no two are the same board under a turn",
    " * or a mirror, and `difficulty.test.ts` holds the order to the measure.",
    " */",
    `export const TSUNAGI_${size}: readonly (readonly [string, string])[] = [`,
    ...levels.map(([layout, answer]) => `  ["${layout}", "${answer}"],`),
    "];",
    "",
  ].join("\n");
}

const asked = process.argv.slice(2).map(Number).filter((size) => POOL_JOBS[size] !== undefined);
const marks: Record<number, string> = { ...TSUNAGI_MARKS };
const roles: Record<number, Record<number, TwistRole>> = { ...TSUNAGI_ROLES };
for (const size of asked.length > 0 ? asked : Object.keys(POOL_JOBS).map(Number)) {
  const started = performance.now();
  const plain = byDifficulty(readPool(size, "plain", POOL_JOBS[size]!.plain), size);
  if (plain.length < WANTED) throw new Error(`${size}×${size}: ${plain.length} boards in the pool, ${WANTED} wanted`);
  // Evenly along the pool, easiest to hardest.
  const picked: Level[] = Array.from({ length: WANTED }, (_, at) => {
    const board = plain[Math.round((at * (plain.length - 1)) / (WANTED - 1))]!;
    return [board.layout, board.answer] as const;
  });
  const order = orderByDifficulty(picked, size);
  const ordered = order.map((at) => picked[at]!);
  // The twist pools, easiest first within their kind, as `pools` in `tsunagi-twists.ts` makes them.
  const pool = Object.fromEntries(KINDS.map((kind) => [kind, byDifficulty(readPool<PoolBoard & TwistCandidate>(size, kind, POOL_JOBS[size]!.twists), size) as TwistCandidate[]])) as Record<Kind, TwistCandidate[]>;
  const twisted = withTwists(size, ordered, new Set(), { tries: 0, longest: size * 3, budget: 15_000, pool });
  for (const each of twisted.placed) console.log(`  level ${each.level}: ${each.kind}`);
  if (twisted.kept.length > 0) console.log(`  blocks kept plain: ${twisted.kept.join(", ")}`);
  const levels = twisted.levels;
  writeFileSync(`src/levels/size${size}.data.ts`, fileFor(size, levels));
  const scores = difficultyScores(levels.map(([layout, answer]) => measureLevel(layout, answer, size)!), size);
  marks[size] = scores.map((score) => String(Math.min(5, 1 + Math.floor(score / 20)))).join("");
  const layouts = levels.map(([layout]) => layout);
  roles[size] = Object.fromEntries(layouts.flatMap((_, at) => {
    const role = twistRole(layouts, at + 1);
    return role === null ? [] : [[at + 1, role]];
  }));
  console.log(`${size}×${size}: ${levels.length} levels from a pool of ${plain.length}, ${Math.round((performance.now() - started) / 1000)} s`);
}
writeFileSync("src/levels/marks.data.ts", marksFile(marks, roles, { ...TSUNAGI_PORTAL_MARKS }));
