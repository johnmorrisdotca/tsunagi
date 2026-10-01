import { CELL_BLOCKED, CELL_BRIDGE, CELL_EMPTY, type LinkLayout } from "./code.ts";
import { Sat } from "./sat.ts";
import type { SolveCount } from "./solve.ts";
import { bridgesOf, stepTable } from "./steps.ts";

/**
 * COUNTING A BOARD'S ANSWERS BY SAT: the same count as `countSolutions`
 * (`solve.ts`), made by writing the board down as clauses and letting a
 * conflict-driven solver (`sat.ts`) search. It is how the 13×13 to 15×15
 * levels were found and proved: on a board of fifteen long lines the search
 * of `solve.ts` and `solveFast.ts` loses itself in dead ends it cannot see
 * until a line reaches them, where a solver that learns from each dead end
 * does not walk into it twice.
 *
 * A variable for each edge between neighbouring cells and for each cell's
 * pair (its colour). Each empty cell has exactly two edges and each stone one;
 * an edge joins cells of one colour, so a line from a stone can only end at
 * the other stone of its pair; a bridge's two edges are always in, and the two
 * lines over one are different colours; walls are edges that are not there,
 * and wrap and hexagon boards only have other neighbours (`stepTable`).
 * What the clauses leave out is a ring of empty cells, which has every cell
 * its two edges: a ring found in an answer is ruled out and the search goes
 * on, and every unit square is ruled out at the start.
 *
 * Answers are counted by ruling each one out in turn, up to the limit asked
 * for, so a count of two is two answers found and a count of one is one
 * found and the rest refused. The edges of the lines a level was made from
 * can be given as a guide: the search starts from them, so the answer it was
 * made from is found first and every other answer is looked for from there.
 */
export function countSolutionsSat(layout: LinkLayout, limit = 2, budget = Number.POSITIVE_INFINITY, guide: readonly (readonly number[])[] | null = null): SolveCount {
  const { size, cells, ends } = layout;
  const total = size * size;
  const steps = stepTable(layout);
  const pairs = ends.length;
  const result: SolveCount = { count: 0, nodes: 0, branches: 0, solution: null, solutions: [], gaveUp: false };
  if (cells.some((cell, at) => cell >= 0 && ends[cell]![0] !== at && ends[cell]![1] !== at)) return result;

  // The edges: every step between two cells a line can stand on, once, and the bridge a step crosses.
  const standable = (at: number) => cells[at] !== CELL_BLOCKED && cells[at] !== CELL_BRIDGE;
  const eu: number[] = [];
  const ev: number[] = [];
  const over: number[] = [];
  const seen = new Set<number>();
  for (let at = 0; at < total; at += 1) {
    if (!standable(at)) continue;
    for (const step of steps[at]!) {
      if (!standable(step.to)) continue;
      const a = Math.min(at, step.to);
      const b = Math.max(at, step.to);
      if (seen.has(a * total + b)) continue;
      seen.add(a * total + b);
      eu.push(a);
      ev.push(b);
      over.push(step.over);
    }
  }
  const edges = eu.length;
  const around: number[][] = Array.from({ length: total }, () => []);
  for (let e = 0; e < edges; e += 1) {
    around[eu[e]!]!.push(e);
    around[ev[e]!]!.push(e);
  }

  const sat = new Sat();
  const edgeVar = Int32Array.from({ length: edges }, () => sat.newVar());
  const colourVar: Int32Array[] = Array.from({ length: total }, () => new Int32Array(0));
  for (let at = 0; at < total; at += 1) if (standable(at)) colourVar[at] = Int32Array.from({ length: pairs }, () => sat.newVar());

  const subsets = (items: readonly number[], size: number, each: (picked: number[]) => void): void => {
    const picked: number[] = [];
    const go = (from: number) => {
      if (picked.length === size) {
        each([...picked]);
        return;
      }
      for (let k = from; k < items.length; k += 1) {
        picked.push(items[k]!);
        go(k + 1);
        picked.pop();
      }
    };
    go(0);
  };

  for (let at = 0; at < total; at += 1) {
    if (!standable(at)) continue;
    // Which pair a cell is in: exactly one; a stone or a waypoint is told its own.
    const colours = colourVar[at]!;
    sat.addClause([...colours]);
    for (let a = 0; a < pairs; a += 1) for (let b = a + 1; b < pairs; b += 1) sat.addClause([-colours[a]!, -colours[b]!]);
    const named = cells[at]! >= 0 ? cells[at]! : (layout.waypoints.get(at) ?? -1);
    if (named >= 0) sat.addClause([colours[named]!]);
    // Exactly two edges, or one at a stone.
    const mine = around[at]!.map((e) => edgeVar[e]!);
    const want = cells[at]! >= 0 ? 1 : 2;
    if (mine.length < want) return result;
    subsets(mine, want + 1, (picked) => sat.addClause(picked.map((v) => -v)));
    subsets(mine, mine.length - want + 1, (picked) => sat.addClause(picked));
  }
  for (let e = 0; e < edges; e += 1) {
    const a = colourVar[eu[e]!]!;
    const b = colourVar[ev[e]!]!;
    for (let k = 0; k < pairs; k += 1) {
      // An edge joins two cells of one pair.
      sat.addClause([-edgeVar[e]!, -a[k]!, b[k]!]);
      sat.addClause([-edgeVar[e]!, a[k]!, -b[k]!]);
    }
  }
  // A bridge's two edges are always in, and the lines over it are of different pairs.
  const slots = new Map<number, number[]>();
  for (let e = 0; e < edges; e += 1) if (over[e]! !== -1) slots.set(over[e]!, [...(slots.get(over[e]!) ?? []), e]);
  for (const bridge of bridgesOf(layout)) {
    const slot = slots.get(bridge) ?? [];
    for (const e of slot) sat.addClause([edgeVar[e]!]);
    if (slot.length === 2) for (let k = 0; k < pairs; k += 1) sat.addClause([-colourVar[eu[slot[0]!]!]![k]!, -colourVar[eu[slot[1]!]!]![k]!]);
  }
  // Every unit square's four edges are not all in: that would be a ring.
  const edgeOf = new Map<number, number>();
  for (let e = 0; e < edges; e += 1) edgeOf.set(eu[e]! * total + ev[e]!, e);
  const between = (a: number, b: number) => edgeOf.get(Math.min(a, b) * total + Math.max(a, b));
  if (!layout.hex && !layout.wrap) {
    for (let at = 0; at < total; at += 1) {
      if (at % size === size - 1 || at + size >= total) continue;
      const square = [between(at, at + 1), between(at + 1, at + size + 1), between(at + size, at + size + 1), between(at, at + size)];
      if (square.every((e) => e !== undefined)) sat.addClause(square.map((e) => -edgeVar[e!]!));
    }
  }
  // Starting phases: the guide's own edges in.
  if (guide !== null) {
    for (const line of guide) {
      let previous = -1;
      for (const cell of line) {
        if (cells[cell] === CELL_BRIDGE) continue;
        if (previous !== -1) {
          const e = between(previous, cell);
          if (e !== undefined) sat.prefer(edgeVar[e]!, true);
        }
        previous = cell;
      }
    }
  }

  const owner = new Int16Array(total);
  // What the search cost is what it had to back out of: `branches` counts the dead ends it met, `nodes` those and every choice it made.
  const tally = () => {
    result.branches = sat.conflicts;
    result.nodes = sat.conflicts + sat.decisions;
  };
  for (;;) {
    const verdict = sat.solve(budget - sat.conflicts);
    tally();
    if (verdict === "unknown") {
      result.gaveUp = true;
      return result;
    }
    if (verdict === "unsat") return result;
    // The edges the answer has, and the rings among them.
    const taken: number[] = [];
    const next: number[][] = Array.from({ length: total }, () => []);
    for (let e = 0; e < edges; e += 1) {
      if (!sat.modelValue(edgeVar[e]!)) continue;
      taken.push(e);
      next[eu[e]!]!.push(e);
      next[ev[e]!]!.push(e);
    }
    const reached = new Uint8Array(total);
    for (let at = 0; at < total; at += 1) owner[at] = cells[at]! === CELL_EMPTY ? -1 : cells[at]!;
    for (let pair = 0; pair < pairs; pair += 1) {
      let previous = -1;
      let at = ends[pair]![0];
      for (;;) {
        reached[at] = 1;
        owner[at] = pair;
        const step = next[at]!.find((e) => (eu[e] === at ? ev[e]! : eu[e]!) !== previous);
        if (step === undefined) break;
        previous = at;
        at = eu[step] === at ? ev[step]! : eu[step]!;
        if (cells[at]! >= 0) {
          reached[at] = 1;
          break;
        }
      }
    }
    const rings: number[][] = [];
    for (let at = 0; at < total; at += 1) {
      if (!standable(at) || reached[at] === 1) continue;
      // A ring: walk it, marking cells.
      const ring: number[] = [];
      let here = at;
      let previous = -1;
      for (;;) {
        reached[here] = 1;
        const e = next[here]!.find((each) => (eu[each] === here ? ev[each]! : eu[each]!) !== previous && reached[eu[each] === here ? ev[each]! : eu[each]!] === 0);
        if (e === undefined) {
          const closing = next[here]!.find((each) => (eu[each] === here ? ev[each]! : eu[each]!) === at && (eu[each] === here ? ev[each]! : eu[each]!) !== previous);
          if (closing !== undefined) ring.push(closing);
          break;
        }
        ring.push(e);
        previous = here;
        here = eu[e] === here ? ev[e]! : eu[e]!;
      }
      rings.push(ring);
    }
    if (rings.length > 0) {
      for (const ring of rings) sat.addClause(ring.map((e) => -edgeVar[e]!));
      continue;
    }
    result.count += 1;
    const answer = Array.from(owner, (owned, at) => (cells[at] === CELL_BRIDGE ? CELL_BRIDGE : owned));
    if (result.solution === null) result.solution = answer;
    result.solutions.push(answer);
    if (result.count >= limit) return result;
    sat.addClause(taken.map((e) => -edgeVar[e]!));
  }
}
