/**
 * THE POOL OF BIG-BOARD LEVELS, MADE ON A DESK in parallel: `node scripts/tsunagi-pool.ts <size> <plain|bridge|bridges|walls|wallsAndBlocked|bridgeAndWalls|waypoints|wrap|hexagon> <jobs> [<first job>]`.
 *
 * A job is a seeded run over a fixed number of fillings with at most sixteen
 * lines (`JOB_FILLINGS`), laid with the greed `GREEDS` gives its number, so what it finds does not depend on how fast the
 * machine is or how many jobs run at once: job `j` of size `s` always finds the
 * same boards. Each filling's layout is proved to have exactly one answer
 * (`countSolutions`, which is `solveSat.ts` from 13×13) and measured, and the
 * boards that pass are written one JSON line each to
 * `scripts/.tsunagi-pool/size<s>.<kind>.jsonl`, in job order. Jobs already in that file
 * are not run again. `scripts/tsunagi-levels-big.ts` reads the pool and makes
 * the size's levels from it.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { cpus } from "node:os";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";

import { decodeLayout } from "../src/code.ts";
import { layoutOf, randomFilling, symmetryKey, turnsIn } from "../src/generate.ts";
import { forcedShare } from "../src/difficulty.ts";
import { seededRandom } from "../src/random.ts";
import { candidateOf, type Kind } from "./tsunagi-twists.ts";
import { countSolutions } from "../src/solve.ts";
import { countSolutionsSat } from "../src/solveSat.ts";

/** Fillings with at most sixteen lines a job looks at. */
export const JOB_FILLINGS = 10;
/** How eagerly a job's lines take their tightest way on (`FillingStyle`): the way they always did, and four steps toward always. Greedier lines are longer, so a board needs fewer of them; a job's greed is `GREEDS[job % 5]`. */
export const GREEDS = [0.7, 0.8, 0.9, 0.95, 1] as const;
/** Attempts at a twist board a job makes, by size: a filling of few enough lines is rarer the bigger the board. */
const JOB_ATTEMPTS: Record<number, number> = { 13: 60, 14: 120, 15: 250 };
/** Dead ends the quick check of a filling's guide may meet before the board is dropped, and the measuring run. */
const CHECK_BUDGET = 40_000;
const MEASURE_BUDGET = 15_000;
const MOST_PAIRS = 16;
const SEED = 20261001;

export type PoolBoard = { layout: string; answer: string; pairs: number; nodes: number; branches: number; turns: number; forced: number; longest: number; key: string; job: number };

/** One job's boards. */
export function runJob(size: number, job: number): PoolBoard[] {
  const random = seededRandom(SEED + size * 1_000_003 + job);
  const out: PoolBoard[] = [];
  let looked = 0;
  while (looked < JOB_FILLINGS) {
    const paths = randomFilling(size, random, size * 3, new Set(), false, false, { greed: GREEDS[job % GREEDS.length] });
    if (paths === null || paths.length > MOST_PAIRS) continue;
    looked += 1;
    const { layout, answer } = layoutOf(size, paths);
    const decoded = decodeLayout(layout, size);
    if (decoded === null) continue;
    // Guided by the filling it was made from, which finds that answer first; then proved, and measured, as the tests will.
    const quick = countSolutionsSat(decoded, 2, CHECK_BUDGET, paths);
    if (quick.gaveUp || quick.count !== 1) continue;
    const measured = countSolutions(decoded, 2, MEASURE_BUDGET);
    if (measured.gaveUp || measured.count !== 1) continue;
    out.push({
      layout,
      answer,
      pairs: decoded.ends.length,
      nodes: measured.nodes,
      branches: measured.branches,
      turns: turnsIn(answer, decoded),
      forced: forcedShare(layout, size),
      longest: Math.max(...paths.map((path) => path.length)),
      key: symmetryKey(layout, size),
      job,
    });
  }
  return out;
}

/** One job's twist boards of one kind, from a stream of its own. */
export function runTwistJob(size: number, kind: Kind, job: number): (PoolBoard & { kind: Kind; bridges: number; walls: number; blocked: number })[] {
  const kinds = ["bridge", "bridges", "walls", "wallsAndBlocked", "bridgeAndWalls", "waypoints", "wrap", "hexagon"];
  const random = seededRandom(SEED + size * 1_000_003 + (kinds.indexOf(kind) + 1) * 7_919_999 + job);
  const found = new Map<string, PoolBoard & { kind: Kind; bridges: number; walls: number; blocked: number }>();
  for (let attempt = 0; attempt < JOB_ATTEMPTS[size]!; attempt += 1) {
    const made = candidateOf(kind, size, random, size * 3, MEASURE_BUDGET, { greed: GREEDS[job % GREEDS.length] });
    if (made === null || made.pairs > MOST_PAIRS || found.has(made.key)) continue;
    found.set(made.key, { ...made, forced: forcedShare(made.layout, size), longest: 0, job, kind });
  }
  return [...found.values()];
}

if (!isMainThread) {
  const { size, jobs, kind } = workerData as { size: number; jobs: number[]; kind: string };
  for (const job of jobs) parentPort!.postMessage({ job, boards: kind === "plain" ? runJob(size, job) : runTwistJob(size, kind as Kind, job) });
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const size = Number(process.argv[2]);
  const kind = process.argv[3]!;
  const count = Number(process.argv[4]);
  const first = Number(process.argv[5] ?? 0);
  mkdirSync("scripts/.tsunagi-pool", { recursive: true });
  const file = `scripts/.tsunagi-pool/size${size}.${kind}.jsonl`;
  const done = new Set<number>();
  if (existsSync(file)) for (const line of readFileSync(file, "utf8").split("\n")) if (line !== "") done.add((JSON.parse(line) as PoolBoard).job);
  // A job with no board leaves no line, so a done list is kept beside the file.
  const doneFile = `scripts/.tsunagi-pool/size${size}.${kind}.done`;
  if (existsSync(doneFile)) for (const each of readFileSync(doneFile, "utf8").split("\n")) if (each !== "") done.add(Number(each));
  const todo = Array.from({ length: count }, (_, at) => first + at).filter((job) => !done.has(job));
  const workers = Math.max(1, Math.min(todo.length, cpus().length - 2));
  const started = Date.now();
  let finished = 0;
  let boards = 0;
  for (let w = 0; w < workers; w += 1) {
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { size, kind, jobs: todo.filter((_, at) => at % workers === w) } });
    worker.on("message", ({ job, boards: found }: { job: number; boards: PoolBoard[] }) => {
      for (const board of found) appendFileSync(file, JSON.stringify(board) + "\n");
      appendFileSync(doneFile, `${job}\n`);
      finished += 1;
      boards += found.length;
      if (finished % 10 === 0 || finished === todo.length) console.log(`${size}×${size} ${kind}: ${finished}/${todo.length} jobs, ${boards} boards, ${Math.round((Date.now() - started) / 1000)} s`);
    });
  }
}
