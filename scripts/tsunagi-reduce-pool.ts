/**
 * THE POOL OF BIG-BOARD AND PORTAL LEVELS, MADE ON A DESK in parallel by taking clues away
 * (`src/reduce.ts`): `node scripts/tsunagi-reduce-pool.ts <size> <kind> <jobs> [<first job>]`.
 *
 * A job is a seeded run of `attemptsFor(size)` boards at a budget of dead ends its number
 * decides (`BUDGETS`: the cheaper the proof allowed, the more lines the board is
 * left with and the easier it is) and a greed it decides (`GREEDS`), so job `j` of a size and kind
 * always finds the same boards on any machine. (The 20×20 pools were made at greed 1 alone, before
 * the greeds were varied: their boards wind round the edge in spirals.) Each board is measured as the level tests will measure
 * it and the ones that pass are written one JSON line each to
 * `scripts/.tsunagi-pool/size<s>.<kind>.jsonl`; jobs already done are not run again.
 * `scripts/tsunagi-levels-huge.ts` and `scripts/tsunagi-levels-portals.ts` read it.
 *
 * Kinds: `plain`, `wrap`, `blocked` (six cells no line enters), `portals1`, `portals2`, `portals3`, `portals4` (that many
 * portals on a plain board) and `portalsWrap2`, `portalsWrap3` (on a board that wraps).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { cpus } from "node:os";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";

import { forcedShare } from "../src/difficulty.ts";
import { seededRandom } from "../src/random.ts";
import { reducedCandidate, type ReduceOptions } from "../src/reduce.ts";
import type { PoolBoard } from "./tsunagi-pool.ts";

/** How eagerly a job's lines take their tightest way on (`FillingStyle`): the way they always did, and four steps toward always. Greedier lines are longer and wind round the board's edge in a spiral; the lower greeds wander. A job's is `GREEDS[⌊job / 5⌋ mod 5]`, so that it is not tied to the budget. */
export const GREEDS = [1, 0.8, 0.9, 0.7, 0.95] as const;

/** Dead ends a job lets one join cost, cheapest first: a board made with a small budget has many lines and is easy. */
export const BUDGETS = [3_000, 6_000, 12_000, 25_000, 50_000] as const;

/** Boards a job makes, by side: the bigger the board, the longer one takes. */
export function attemptsFor(size: number): number {
  return size >= 30 ? 2 : size >= 25 ? 3 : size >= 20 ? 4 : size >= 15 ? 8 : 16;
}

const SEED = 20261005;
export const KINDS = ["plain", "wrap", "blocked", "portals1", "portals2", "portals3", "portals4", "portalsWrap2", "portalsWrap3"] as const;
export type PoolKind = (typeof KINDS)[number];

/** What a kind asks of the generator. */
export function optionsOf(kind: PoolKind): ReduceOptions {
  const portals = /^portals(?:Wrap)?(\d)$/.exec(kind);
  return { wrap: kind === "wrap" || kind.startsWith("portalsWrap"), portals: portals === null ? 0 : Number(portals[1]), ...(kind === "blocked" ? { blockedCount: 6 } : {}) };
}

export type ReducedPoolBoard = PoolBoard & { kind: PoolKind; portals: number; wrap: boolean };

/** One job's boards. */
export function runJob(size: number, kind: PoolKind, job: number): ReducedPoolBoard[] {
  const random = seededRandom(SEED + size * 1_000_003 + (KINDS.indexOf(kind) + 1) * 7_919_999 + job);
  // POOL_BUDGET sets one for every job of a run: the 30×30 boards that wrap need far more than the table's.
  const budget = process.env.POOL_BUDGET === undefined ? BUDGETS[job % BUDGETS.length]! : Number(process.env.POOL_BUDGET);
  const out: ReducedPoolBoard[] = [];
  const seen = new Set<string>();
  for (let attempt = 0; attempt < attemptsFor(size); attempt += 1) {
    const made = reducedCandidate(size, random, { ...optionsOf(kind), budget, greed: GREEDS[Math.floor(job / BUDGETS.length) % GREEDS.length] });
    if (made === null || seen.has(made.key)) continue;
    seen.add(made.key);
    const lengths = [...new Set([...made.answer].filter((char) => char !== "#" && char !== "+" && char !== "."))].map((letter) => [...made.answer].filter((char) => char === letter).length);
    out.push({ ...made, forced: forcedShare(made.layout, size), longest: Math.max(...lengths), job, kind, portals: made.portals, wrap: made.wrap });
  }
  return out;
}

if (!isMainThread) {
  const { size, jobs, kind } = workerData as { size: number; jobs: number[]; kind: PoolKind };
  for (const job of jobs) parentPort!.postMessage({ job, boards: runJob(size, kind, job) });
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const size = Number(process.argv[2]);
  const kind = process.argv[3] as PoolKind;
  if (!KINDS.includes(kind)) throw new Error(`kind is one of ${KINDS.join(", ")}`);
  const count = Number(process.argv[4]);
  const first = Number(process.argv[5] ?? 0);
  mkdirSync("scripts/.tsunagi-pool", { recursive: true });
  const file = `scripts/.tsunagi-pool/size${size}.${kind}.jsonl`;
  const doneFile = `scripts/.tsunagi-pool/size${size}.${kind}.done`;
  const done = new Set<number>();
  if (existsSync(doneFile)) for (const each of readFileSync(doneFile, "utf8").split("\n")) if (each !== "") done.add(Number(each));
  const todo = Array.from({ length: count }, (_, at) => first + at).filter((job) => !done.has(job));
  const workers = Math.max(1, Math.min(todo.length, Number(process.env.POOL_WORKERS ?? cpus().length - 2)));
  const started = Date.now();
  let finished = 0;
  let boards = 0;
  for (let w = 0; w < workers; w += 1) {
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { size, kind, jobs: todo.filter((_, at) => at % workers === w) } });
    worker.on("message", ({ job, boards: found }: { job: number; boards: ReducedPoolBoard[] }) => {
      for (const board of found) appendFileSync(file, JSON.stringify(board) + "\n");
      appendFileSync(doneFile, `${job}\n`);
      finished += 1;
      boards += found.length;
      if (finished % 5 === 0 || finished === todo.length) console.log(`${size}×${size} ${kind}: ${finished}/${todo.length} jobs, ${boards} boards, ${Math.round((Date.now() - started) / 1000)} s`);
    });
  }
}
