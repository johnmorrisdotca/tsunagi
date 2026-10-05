/**
 * THE PORTAL LEVELS, MADE ON A DESK: `node scripts/tsunagi-levels-portals.ts [size…]`.
 *
 * John, 2026-10-05, asked whether Tsunagi has warps, where a line goes in at one side and
 * comes out at another. The edges that join are `wrap`; a portal is the same thing inside the
 * board: two rings, and a line that goes into one comes out of the other going the same way.
 * A second set of levels, `TSUNAGI_PORTAL_SIZES`, thirty-two to a size in two blocks of sixteen:
 * the first block's boards have one portal, the second's two or three.
 *
 * It reads the pools `scripts/tsunagi-reduce-pool.ts <size> portals1|portals2|portals3` made
 * (boards of at most 82 lines, each proved to have exactly one answer from its own answer and
 * measured), takes each block evenly along its pool ordered by the measured difficulty
 * (`difficulty.ts`), orders the block by it, and writes `src/levels/portals.data.ts` and the
 * portal levels' marks in `src/levels/marks.data.ts`. Nothing of the first set is touched.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { PAIR_LETTERS } from "../src/code.ts";
import { difficultyScores, measureLevel, orderByDifficulty, type LevelMeasure } from "../src/difficulty.ts";
import { TSUNAGI_BLOCK } from "../src/levelBlocks.ts";
import { TSUNAGI_PORTAL_COUNTS, TSUNAGI_PORTAL_SIZES } from "../src/levelCounts.ts";
import { TSUNAGI_MARKS, TSUNAGI_PORTAL_MARKS, TSUNAGI_ROLES } from "../src/levels/marks.data.ts";
import { marksFile } from "./tsunagi-marks-file.ts";
import type { ReducedPoolBoard } from "./tsunagi-reduce-pool.ts";

type Level = readonly [string, string];

function readPool(size: number, kind: string): ReducedPoolBoard[] {
  const file = `scripts/.tsunagi-pool/size${size}.${kind}.jsonl`;
  if (!existsSync(file)) return [];
  const seen = new Set<string>();
  const out: ReducedPoolBoard[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line === "") continue;
    const board = JSON.parse(line) as ReducedPoolBoard;
    if (seen.has(board.key)) continue;
    seen.add(board.key);
    out.push(board);
  }
  return out.sort((a, b) => a.job - b.job || (a.key < b.key ? -1 : 1));
}

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

function byDifficulty(boards: readonly ReducedPoolBoard[], size: number): ReducedPoolBoard[] {
  const scores = difficultyScores(boards.map(measureOf), size);
  return boards
    .map((board, at) => ({ board, score: scores[at]! }))
    .sort((a, b) => a.score - b.score || (a.board.key < b.board.key ? -1 : 1))
    .map(({ board }) => board);
}

function fileFor(all: Record<number, readonly Level[]>): string {
  return [
    "/**",
    " * TSUNAGI WITH PORTALS: thirty-two levels a size, in two blocks of 16, easiest first by the",
    " * measured difficulty (`difficulty.ts`) within each block. The first block's boards have one",
    " * portal, the second's two or three. Each level is its layout and its one answer.",
    " *",
    " * WRITTEN BY `node scripts/tsunagi-levels-portals.ts`, NEVER BY HAND, from the pools",
    " * `node scripts/tsunagi-reduce-pool.ts` makes. Every level is proved to have exactly one",
    " * answer by `portalLevels.test.ts`, and no two are the same board under a turn or a mirror.",
    " */",
    "export const TSUNAGI_PORTAL_LEVELS: Readonly<Record<number, readonly (readonly [string, string])[]>> = {",
    ...Object.entries(all).flatMap(([size, levels]) => [`  ${size}: [`, ...levels.map(([layout, answer]) => `    ["${layout}", "${answer}"],`), "  ],"]),
    "};",
    "",
  ].join("\n");
}

const asked = process.argv.slice(2).map(Number).filter((size) => (TSUNAGI_PORTAL_SIZES as readonly number[]).includes(size));
const written: Record<number, readonly Level[]> = {};
// A run over some sizes keeps the levels of the rest as they were.
if (existsSync("src/levels/portals.data.ts")) {
  const kept = (await import("../src/levels/portals.data.ts")).TSUNAGI_PORTAL_LEVELS;
  for (const [size, levels] of Object.entries(kept)) written[Number(size)] = levels;
}
const portalMarks: Record<number, string> = { ...TSUNAGI_PORTAL_MARKS };
for (const size of asked.length > 0 ? asked : TSUNAGI_PORTAL_SIZES) {
  const started = performance.now();
  const used = new Set<string>();
  const block = (kinds: readonly string[]): Level[] => {
    const pool = byDifficulty(kinds.flatMap((kind) => readPool(size, kind)).filter((board) => !used.has(board.key)), size);
    if (pool.length < TSUNAGI_BLOCK) throw new Error(`${size}×${size} ${kinds.join("+")}: ${pool.length} boards in the pool, ${TSUNAGI_BLOCK} wanted`);
    const picked = Array.from({ length: TSUNAGI_BLOCK }, (_, at) => pool[Math.round((at * (pool.length - 1)) / (TSUNAGI_BLOCK - 1))]!);
    for (const board of picked) used.add(board.key);
    const levels = picked.map((board) => [board.layout, board.answer] as const);
    return orderByDifficulty(levels, size).map((at) => levels[at]!);
  };
  const levels = [...block(["portals1"]), ...block(["portals2", "portals3"])];
  if (levels.length !== TSUNAGI_PORTAL_COUNTS[size]) throw new Error(`${size}×${size}: ${levels.length} levels, ${TSUNAGI_PORTAL_COUNTS[size]} wanted`);
  written[size] = levels;
  const scores = difficultyScores(levels.map(([layout, answer]) => measureLevel(layout, answer, size)!), size);
  portalMarks[size] = scores.map((score) => String(Math.min(5, 1 + Math.floor(score / 20)))).join("");
  console.log(`${size}×${size}: ${levels.length} portal levels, ${Math.round((performance.now() - started) / 1000)} s`);
}
const sorted = Object.fromEntries(Object.entries(written).sort(([a], [b]) => Number(a) - Number(b)));
writeFileSync("src/levels/portals.data.ts", fileFor(sorted));
writeFileSync("src/levels/marks.data.ts", marksFile({ ...TSUNAGI_MARKS }, { ...TSUNAGI_ROLES }, portalMarks));
