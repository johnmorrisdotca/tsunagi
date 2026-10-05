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
/** How a cell's pair is written as variables: a variable for each pair (the way every level to 15×15 was proved), or a binary number, which a board of many pairs can afford. */
export type SatColours = "one-hot" | "binary";

/** The clauses a layout comes to, ready to be searched. */
export type EdgeModel = {
  sat: Sat;
  total: number;
  /** Every edge as the two cells it joins (the smaller first), the bridge it crosses (or -1) and the portal it goes through (the index in `layout.portalPairs`, or -1). */
  eu: number[];
  ev: number[];
  over: number[];
  via: number[];
  edgeVar: Int32Array;
  /** The edges at each cell. */
  around: number[][];
  /** The edge between two neighbouring cells on a plain step, or the one through portal `via` (-1 for a plain step); undefined where there is none. */
  between: (a: number, b: number, via?: number) => number | undefined;
  /** Whether a line can stand on a cell: not blocked, not a bridge, not a portal. */
  standable: (at: number) => boolean;
  /** Each portal cell's two cells' pair variables, for a model that has them (colours, one-hot or binary). */
  colourVar: Int32Array[];
};

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

/**
 * A layout written down as clauses (see the top of this file), or null where
 * it cannot be solved at all: a stone its pair does not name, or a cell with
 * too few ways in and out to hold a line.
 */
export function edgeModel(layout: LinkLayout, colours: SatColours = "one-hot"): EdgeModel | null {
  const { size, cells, ends } = layout;
  const total = size * size;
  const steps = stepTable(layout);
  const pairs = ends.length;
  if (cells.some((cell, at) => cell >= 0 && ends[cell]![0] !== at && ends[cell]![1] !== at)) return null;

  // The edges: every step between two cells a line can stand on, once, the bridge it crosses and the portal it goes through.
  const standable = (at: number) => cells[at] !== CELL_BLOCKED && cells[at] !== CELL_BRIDGE && !layout.portals.has(at);
  const eu: number[] = [];
  const ev: number[] = [];
  const over: number[] = [];
  const via: number[] = [];
  const seen = new Set<number>();
  const portalIndex = new Map<number, number>();
  layout.portalPairs.forEach(([a, b], index) => {
    portalIndex.set(a, index);
    portalIndex.set(b, index);
  });
  for (let at = 0; at < total; at += 1) {
    if (!standable(at)) continue;
    for (const step of steps[at]!) {
      if (!standable(step.to)) continue;
      const a = Math.min(at, step.to);
      const b = Math.max(at, step.to);
      const portal = step.through.length === 0 ? -1 : portalIndex.get(step.through[0]!)!;
      const key = (a * total + b) * (layout.portalPairs.length + 1) + portal + 1;
      if (seen.has(key)) continue;
      seen.add(key);
      eu.push(a);
      ev.push(b);
      over.push(step.over);
      via.push(portal);
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
  const bits = Math.max(1, Math.ceil(Math.log2(Math.max(2, pairs))));
  // A cell a line stands on has a pair; a portal cell has one too, the pair of the line that goes through it.
  const coloured = (at: number) => standable(at) || layout.portals.has(at);
  for (let at = 0; at < total; at += 1) if (coloured(at)) colourVar[at] = Int32Array.from({ length: colours === "binary" ? bits : pairs }, () => sat.newVar());

  /** Cell `at` is of pair `pair`. */
  const named = (at: number, pair: number) => {
    const own = colourVar[at]!;
    if (colours === "one-hot") sat.addClause([own[pair]!]);
    else for (let bit = 0; bit < bits; bit += 1) sat.addClause([(pair >> bit) & 1 ? own[bit]! : -own[bit]!]);
  };
  /** If `when` holds, cells `a` and `b` are of one pair. */
  const sameIf = (when: number, a: number, b: number) => {
    const x = colourVar[a]!;
    const y = colourVar[b]!;
    for (let k = 0; k < x.length; k += 1) {
      sat.addClause([-when, -x[k]!, y[k]!]);
      sat.addClause([-when, x[k]!, -y[k]!]);
    }
  };

  for (let at = 0; at < total; at += 1) {
    if (!coloured(at)) continue;
    // Which pair a cell is in: exactly one; a stone or a waypoint is told its own.
    const own = colourVar[at]!;
    if (colours === "one-hot") {
      sat.addClause([...own]);
      for (let a = 0; a < pairs; a += 1) for (let b = a + 1; b < pairs; b += 1) sat.addClause([-own[a]!, -own[b]!]);
    } else {
      // A number the board has no pair for is no pair.
      for (let code = pairs; code < 2 ** bits; code += 1) sat.addClause(Array.from(own, (variable, bit) => ((code >> bit) & 1 ? -variable : variable)));
    }
    if (!standable(at)) continue;
    const given = cells[at]! >= 0 ? cells[at]! : (layout.waypoints.get(at) ?? -1);
    if (given >= 0) named(at, given);
    // Exactly two edges, or one at a stone.
    const mine = around[at]!.map((e) => edgeVar[e]!);
    const want = cells[at]! >= 0 ? 1 : 2;
    if (mine.length < want) return null;
    subsets(mine, want + 1, (picked) => sat.addClause(picked.map((v) => -v)));
    subsets(mine, mine.length - want + 1, (picked) => sat.addClause(picked));
  }
  for (let e = 0; e < edges; e += 1) sameIf(edgeVar[e]!, eu[e]!, ev[e]!);
  // A bridge's two edges are always in, and the lines over it are of different pairs.
  const slots = new Map<number, number[]>();
  for (let e = 0; e < edges; e += 1) if (over[e]! !== -1) slots.set(over[e]!, [...(slots.get(over[e]!) ?? []), e]);
  for (const bridge of bridgesOf(layout)) {
    const slot = slots.get(bridge) ?? [];
    for (const e of slot) sat.addClause([edgeVar[e]!]);
    if (slot.length === 2) {
      const a = colourVar[eu[slot[0]!]!]!;
      const b = colourVar[eu[slot[1]!]!]!;
      if (colours === "one-hot") for (let k = 0; k < pairs; k += 1) sat.addClause([-a[k]!, -b[k]!]);
      else {
        // Some bit differs.
        const differs = Array.from(a, () => sat.newVar());
        a.forEach((x, bit) => {
          const y = b[bit]!;
          const d = differs[bit]!;
          sat.addClause([-d, x, y]);
          sat.addClause([-d, -x, -y]);
        });
        sat.addClause(differs);
      }
    }
  }
  // A portal is gone through by exactly one line, once; the cells of it are that line's.
  layout.portalPairs.forEach(([p, q], index) => {
    const through = edgeVar.filter((_, e) => via[e] === index);
    sat.addClause([...through]);
    for (let a = 0; a < through.length; a += 1) for (let b = a + 1; b < through.length; b += 1) sat.addClause([-through[a]!, -through[b]!]);
    for (let e = 0; e < edges; e += 1) {
      if (via[e] !== index) continue;
      sameIf(edgeVar[e]!, eu[e]!, p);
      sameIf(edgeVar[e]!, eu[e]!, q);
    }
  });
  // Every unit square's four edges are not all in: that would be a ring.
  const edgeOf = new Map<number, number>();
  for (let e = 0; e < edges; e += 1) if (via[e] === -1) edgeOf.set(eu[e]! * total + ev[e]!, e);
  const between = (a: number, b: number, portal = -1) => {
    if (portal === -1) return edgeOf.get(Math.min(a, b) * total + Math.max(a, b));
    for (const e of around[a]!) if (via[e] === portal && (eu[e] === b || ev[e] === b)) return e;
    return undefined;
  };
  if (!layout.hex && !layout.wrap) {
    for (let at = 0; at < total; at += 1) {
      if (at % size === size - 1 || at + size >= total) continue;
      const square = [between(at, at + 1), between(at + 1, at + size + 1), between(at + size, at + size + 1), between(at, at + size)];
      if (square.every((e) => e !== undefined)) sat.addClause(square.map((e) => -edgeVar[e!]!));
    }
  }
  return { sat, total, eu, ev, over, via, edgeVar, around, between, standable, colourVar };
}

/**
 * Counts a layout's answers by SAT, up to `limit`. `budget` is a number of
 * conflicts; `guide` is the lines the layout was made from (cells in order,
 * portal cells too); `colours` says how a cell's pair is written as variables,
 * and the default is the way every level up to 15×15 was proved: another way
 * writes another search, with other counts.
 */
export function countSolutionsSat(layout: LinkLayout, limit = 2, budget = Number.POSITIVE_INFINITY, guide: readonly (readonly number[])[] | null = null, colours: SatColours = "one-hot"): SolveCount {
  const { cells, ends } = layout;
  const result: SolveCount = { count: 0, nodes: 0, branches: 0, solution: null, solutions: [], gaveUp: false };
  const model = edgeModel(layout, colours);
  if (model === null) return result;
  const { sat, total, eu, ev, via, edgeVar, between, standable } = model;
  const edges = eu.length;
  const pairs = ends.length;
  // Starting phases: the guide's own edges in.
  if (guide !== null) {
    for (const line of guide) {
      let previous = -1;
      let portal = -1;
      for (const cell of line) {
        if (cells[cell] === CELL_BRIDGE) continue;
        // The portal cells of a line are the way from the cell before to the cell after.
        if (layout.portals.has(cell)) {
          if (portal === -1) portal = layout.portalPairs.findIndex(([a, b]) => a === cell || b === cell);
          continue;
        }
        if (previous !== -1) {
          const e = between(previous, cell, portal);
          if (e !== undefined) sat.prefer(edgeVar[e]!, true);
        }
        portal = -1;
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
    // A portal's cells are the pair of the line that goes through it.
    for (const e of taken) if (via[e]! !== -1) for (const cell of layout.portalPairs[via[e]!]!) owner[cell] = owner[eu[e]!]!;
    result.count += 1;
    const answer = Array.from(owner, (owned, at) => (cells[at] === CELL_BRIDGE ? CELL_BRIDGE : owned));
    if (result.solution === null) result.solution = answer;
    result.solutions.push(answer);
    if (result.count >= limit) return result;
    sat.addClause(taken.map((e) => -edgeVar[e]!));
  }
}
