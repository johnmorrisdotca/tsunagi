/**
 * A SMALL SAT SOLVER, written for Tsunagi's big boards: conflict-driven clause
 * learning in the usual shape (two watched literals, first-UIP learning, VSIDS
 * with phase saving, Luby restarts, learnt clauses thinned as they pile up),
 * with clauses that can be added between solves, which is how one answer after
 * another is ruled out when answers are counted.
 *
 * Written for this package and nothing else: a variable is a number from 1, a
 * literal is that number or its negative, and the solver is deterministic, so
 * the same clauses give the same answers and the same counts every time.
 */

/** What `solve` found. */
export type SatResult = "sat" | "unsat" | "unknown";

const UNDEF = 0;

/** The Luby sequence: 1 1 2 1 1 2 4 1 1 2 1 1 2 4 8 …, the restart schedule. */
function luby(index: number): number {
  let size = 1;
  let seq = 0;
  while (size < index + 1) {
    seq += 1;
    size = 2 * size + 1;
  }
  let at = index;
  while (size - 1 !== at) {
    size = (size - 1) >> 1;
    seq -= 1;
    at %= size;
  }
  return 2 ** seq;
}

export class Sat {
  /** How many variables there are. */
  vars = 0;
  /** Conflicts met over every solve: the measure of how much searching it took. */
  conflicts = 0;
  /** Decisions made over every solve. */
  decisions = 0;

  private value: Int8Array = new Int8Array(2);
  private level: Int32Array = new Int32Array(1);
  private reason: Int32Array = new Int32Array(1).fill(-1);
  private activity: Float64Array = new Float64Array(1);
  private phase: Int8Array = new Int8Array(1);
  private seen: Uint8Array = new Uint8Array(1);
  private heapIndex: Int32Array = new Int32Array(1).fill(-1);
  private heap: number[] = [];
  private trail: number[] = [];
  private trailLimit: number[] = [];
  private head = 0;
  private watches: number[][] = [[], []];
  /** Every clause as its literals; learnt ones are marked in `learnt`. A removed clause is null. */
  private clauses: (Int32Array | null)[] = [];
  private learnt: boolean[] = [];
  private clauseActivity: number[] = [];
  private lbd: number[] = [];
  private learntCount = 0;
  private bump = 1;
  private clauseBump = 1;
  private ok = true;

  /** A new variable, numbered from 1. */
  newVar(): number {
    this.vars += 1;
    const v = this.vars;
    if (2 * v + 2 > this.value.length) this.grow();
    this.watches[2 * v] = [];
    this.watches[2 * v + 1] = [];
    this.heapIndex[v] = -1;
    this.phase[v] = -1;
    this.heapInsert(v);
    return v;
  }

  private grow(): void {
    const room = Math.max(64, this.value.length * 2);
    const more = <T extends Int8Array | Int32Array | Float64Array | Uint8Array>(old: T, size: number, fill = 0): T => {
      const next = new (old.constructor as new (n: number) => T)(size);
      next.set(old);
      if (fill !== 0) next.fill(fill, old.length);
      return next;
    };
    this.value = more(this.value, room);
    this.level = more(this.level, room);
    this.reason = more(this.reason, room, -1);
    this.activity = more(this.activity, room);
    this.phase = more(this.phase, room);
    this.seen = more(this.seen, room);
    this.heapIndex = more(this.heapIndex, room, -1);
  }

  /** The literal for variable `v`, true (`positive`) or false. Internal literals are 2v and 2v+1. */
  private static lit(external: number): number {
    return external > 0 ? 2 * external : 2 * -external + 1;
  }

  /** Adds a clause of external literals (nonzero numbers, negative for not). False once the clauses can no longer all hold. */
  addClause(external: readonly number[]): boolean {
    if (!this.ok) return false;
    if (this.trailLimit.length > 0) this.backtrack(0);
    const seenLits = new Set<number>();
    const lits: number[] = [];
    for (const each of external) {
      const l = Sat.lit(each);
      if (this.value[l] === 1 || seenLits.has(l ^ 1)) return true;
      if (this.value[l] === -1 || seenLits.has(l)) continue;
      seenLits.add(l);
      lits.push(l);
    }
    if (lits.length === 0) {
      this.ok = false;
      return false;
    }
    if (lits.length === 1) {
      this.enqueue(lits[0]!, -1);
      if (this.propagate() !== -1) this.ok = false;
      return this.ok;
    }
    this.attach(Int32Array.from(lits), false);
    return true;
  }

  private attach(lits: Int32Array, learnt: boolean): number {
    const id = this.clauses.length;
    this.clauses.push(lits);
    this.learnt.push(learnt);
    this.clauseActivity.push(0);
    this.lbd.push(0);
    this.watches[lits[0]!]!.push(id);
    this.watches[lits[1]!]!.push(id);
    if (learnt) this.learntCount += 1;
    return id;
  }

  private enqueue(l: number, why: number): void {
    this.value[l] = 1;
    this.value[l ^ 1] = -1;
    const v = l >> 1;
    this.level[v] = this.trailLimit.length;
    this.reason[v] = why;
    this.trail.push(l);
  }

  /** Propagates everything queued; the clause that failed, or -1. */
  private propagate(): number {
    while (this.head < this.trail.length) {
      const p = this.trail[this.head++]!;
      const falsified = p ^ 1;
      const list = this.watches[falsified]!;
      let keep = 0;
      let at = 0;
      for (; at < list.length; at += 1) {
        const id = list[at]!;
        const c = this.clauses[id];
        if (c === null || c === undefined) continue;
        if (c[0] === falsified) {
          c[0] = c[1]!;
          c[1] = falsified;
        }
        const first = c[0]!;
        if (this.value[first] === 1) {
          list[keep++] = id;
          continue;
        }
        let found = false;
        for (let k = 2; k < c.length; k += 1) {
          const other = c[k]!;
          if (this.value[other] !== -1) {
            c[1] = other;
            c[k] = falsified;
            this.watches[other]!.push(id);
            found = true;
            break;
          }
        }
        if (found) continue;
        list[keep++] = id;
        if (this.value[first] === -1) {
          // Conflict: keep the rest of the list as it is.
          for (at += 1; at < list.length; at += 1) list[keep++] = list[at]!;
          list.length = keep;
          this.head = this.trail.length;
          return id;
        }
        this.enqueue(first, id);
      }
      list.length = keep;
    }
    return -1;
  }

  private backtrack(to: number): void {
    if (this.trailLimit.length <= to) return;
    const from = this.trailLimit[to]!;
    for (let k = this.trail.length - 1; k >= from; k -= 1) {
      const l = this.trail[k]!;
      const v = l >> 1;
      this.value[l] = UNDEF;
      this.value[l ^ 1] = UNDEF;
      this.phase[v] = (l & 1) === 0 ? 1 : -1;
      this.reason[v] = -1;
      if (this.heapIndex[v]! < 0) this.heapInsert(v);
    }
    this.trail.length = from;
    this.trailLimit.length = to;
    this.head = from;
  }

  // --- VSIDS heap, ordered by activity. ---
  private heapLess(a: number, b: number): boolean {
    return this.activity[a]! > this.activity[b]!;
  }

  private heapUp(start: number): void {
    const v = this.heap[start]!;
    let at = start;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      const up = this.heap[parent]!;
      if (!this.heapLess(v, up)) break;
      this.heap[at] = up;
      this.heapIndex[up] = at;
      at = parent;
    }
    this.heap[at] = v;
    this.heapIndex[v] = at;
  }

  private heapDown(start: number): void {
    const v = this.heap[start]!;
    let at = start;
    for (;;) {
      let child = 2 * at + 1;
      if (child >= this.heap.length) break;
      if (child + 1 < this.heap.length && this.heapLess(this.heap[child + 1]!, this.heap[child]!)) child += 1;
      const down = this.heap[child]!;
      if (!this.heapLess(down, v)) break;
      this.heap[at] = down;
      this.heapIndex[down] = at;
      at = child;
    }
    this.heap[at] = v;
    this.heapIndex[v] = at;
  }

  private heapInsert(v: number): void {
    this.heap.push(v);
    this.heapIndex[v] = this.heap.length - 1;
    this.heapUp(this.heap.length - 1);
  }

  private heapPop(): number {
    const top = this.heap[0]!;
    const last = this.heap.pop()!;
    this.heapIndex[top] = -1;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapIndex[last] = 0;
      this.heapDown(0);
    }
    return top;
  }

  private bumpVar(v: number): void {
    this.activity[v]! += this.bump;
    if (this.activity[v]! > 1e100) {
      for (let k = 1; k <= this.vars; k += 1) this.activity[k]! *= 1e-100;
      this.bump *= 1e-100;
    }
    if (this.heapIndex[v]! >= 0) this.heapUp(this.heapIndex[v]!);
  }

  /** First-UIP learning: the clause to learn, and the level to go back to. */
  private analyze(conflict: number): { learnt: number[]; back: number; lbd: number } {
    const learnt: number[] = [0];
    let pending = 0;
    let p = -1;
    let id = conflict;
    let at = this.trail.length - 1;
    const touched: number[] = [];
    do {
      const c = this.clauses[id]!;
      if (this.learnt[id]) {
        this.clauseActivity[id]! += this.clauseBump;
      }
      for (let k = p === -1 ? 0 : 1; k < c.length; k += 1) {
        const q = c[k]!;
        const v = q >> 1;
        if (this.seen[v] === 0 && this.level[v]! > 0) {
          this.seen[v] = 1;
          touched.push(v);
          this.bumpVar(v);
          if (this.level[v]! >= this.trailLimit.length) pending += 1;
          else learnt.push(q);
        }
      }
      while (this.seen[this.trail[at]! >> 1] === 0) at -= 1;
      p = this.trail[at]!;
      id = this.reason[p >> 1]!;
      at -= 1;
      this.seen[p >> 1] = 0;
      pending -= 1;
    } while (pending > 0);
    learnt[0] = p ^ 1;
    // Drop literals the others already imply.
    const keep: number[] = [learnt[0]!];
    for (let k = 1; k < learnt.length; k += 1) {
      const q = learnt[k]!;
      if (this.reason[q >> 1]! === -1 || !this.redundant(q)) keep.push(q);
    }
    for (const v of touched) this.seen[v] = 0;
    let back = 0;
    if (keep.length > 1) {
      let best = 1;
      for (let k = 2; k < keep.length; k += 1) if (this.level[keep[k]! >> 1]! > this.level[keep[best]! >> 1]!) best = k;
      [keep[1], keep[best]] = [keep[best]!, keep[1]!];
      back = this.level[keep[1]! >> 1]!;
    }
    const levels = new Set<number>();
    for (const q of keep) levels.add(this.level[q >> 1]!);
    return { learnt: keep, back, lbd: levels.size };
  }

  /** Whether a literal of the learnt clause is implied by the rest (one step deep: every other literal of its reason is seen). */
  private redundant(q: number): boolean {
    const c = this.clauses[this.reason[q >> 1]!]!;
    for (let k = 0; k < c.length; k += 1) {
      const r = c[k]!;
      if (r >> 1 === q >> 1) continue;
      if (this.seen[r >> 1] === 0 && this.level[r >> 1]! > 0) return false;
    }
    return true;
  }

  private reduce(): void {
    const candidates: number[] = [];
    for (let id = 0; id < this.clauses.length; id += 1) {
      const c = this.clauses[id];
      if (c === null || c === undefined || !this.learnt[id] || c.length <= 2 || this.lbd[id]! <= 2) continue;
      // A clause that is the reason for a literal now on the trail stays.
      const v = c[0]! >> 1;
      if (this.value[c[0]!] === 1 && this.reason[v] === id) continue;
      candidates.push(id);
    }
    candidates.sort((a, b) => this.lbd[b]! - this.lbd[a]! || this.clauseActivity[a]! - this.clauseActivity[b]!);
    for (const id of candidates.slice(0, candidates.length >> 1)) {
      this.clauses[id] = null;
      this.learntCount -= 1;
    }
    // Watch lists forget removed clauses as they are walked, but a long-unvisited list would hold them: sweep.
    for (let l = 2; l < this.watches.length; l += 1) {
      const list = this.watches[l];
      if (list === undefined) continue;
      let keep = 0;
      for (const id of list) if (this.clauses[id] !== null) list[keep++] = id;
      list.length = keep;
    }
  }

  /**
   * Looks for a way to make every clause true; it gives up with "unknown" past
   * `conflictBudget` conflicts in this call. After "sat", `modelValue` reads the
   * answer. Variables start false unless `prefer` says otherwise.
   */
  solve(conflictBudget = Number.POSITIVE_INFINITY): SatResult {
    if (!this.ok) return "unsat";
    this.backtrack(0);
    if (this.propagate() !== -1) {
      this.ok = false;
      return "unsat";
    }
    const start = this.conflicts;
    let restarts = 0;
    let limit = this.learntLimit();
    for (;;) {
      const allowed = 100 * luby(restarts);
      restarts += 1;
      let used = 0;
      for (;;) {
        const conflict = this.propagate();
        if (conflict !== -1) {
          this.conflicts += 1;
          used += 1;
          if (this.trailLimit.length === 0) {
            this.ok = false;
            return "unsat";
          }
          const { learnt, back, lbd } = this.analyze(conflict);
          this.backtrack(back);
          if (learnt.length === 1) this.enqueue(learnt[0]!, -1);
          else {
            const id = this.attach(Int32Array.from(learnt), true);
            this.lbd[id] = lbd;
            this.clauseActivity[id] = this.clauseBump;
            this.enqueue(learnt[0]!, id);
          }
          this.bump /= 0.95;
          this.clauseBump /= 0.999;
          if (this.conflicts - start > conflictBudget) {
            this.backtrack(0);
            return "unknown";
          }
          continue;
        }
        if (used >= allowed) {
          this.backtrack(0);
          break;
        }
        if (this.learntCount > limit + this.trail.length) {
          this.reduce();
          limit = Math.floor(limit * 1.1);
        }
        // Decide: the most active free variable, in the phase it last had.
        let v = 0;
        while (this.heap.length > 0) {
          const top = this.heapPop();
          if (this.value[2 * top] === UNDEF) {
            v = top;
            break;
          }
        }
        if (v === 0) return "sat";
        this.decisions += 1;
        this.trailLimit.push(this.trail.length);
        this.enqueue(this.phase[v] === 1 ? 2 * v : 2 * v + 1, -1);
      }
    }
  }

  private learntLimit(): number {
    return Math.max(4000, this.clauses.length >> 1);
  }

  /** After "sat": whether variable `v` is true. */
  modelValue(v: number): boolean {
    return this.value[2 * v] === 1;
  }

  /** Starting phase for a variable: true or false is tried first. */
  prefer(v: number, truth: boolean): void {
    this.phase[v] = truth ? 1 : -1;
  }
}
