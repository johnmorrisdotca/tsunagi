import { describe, expect, it } from "vitest";

import { Sat } from "./sat.ts";
import { seededRandom } from "./random.ts";

/** Every way the variables 1..n can be set, checked against clauses: the slow, certain answer a solver is held to. */
function bruteForce(n: number, clauses: readonly (readonly number[])[]): number {
  let count = 0;
  for (let bits = 0; bits < 2 ** n; bits += 1) {
    const holds = clauses.every((clause) => clause.some((lit) => (((bits >> (Math.abs(lit) - 1)) & 1) === 1) === lit > 0));
    if (holds) count += 1;
  }
  return count;
}

/** Every model a solver finds, ruled out one after another: how many there are. */
function countModels(n: number, clauses: readonly (readonly number[])[]): number {
  const sat = new Sat();
  for (let each = 0; each < n; each += 1) sat.newVar();
  for (const clause of clauses) sat.addClause(clause);
  let count = 0;
  while (sat.solve() === "sat") {
    count += 1;
    sat.addClause(Array.from({ length: n }, (_, at) => (sat.modelValue(at + 1) ? -(at + 1) : at + 1)));
  }
  return count;
}

describe("the SAT solver", () => {
  it("finds a model of clauses that have one, and says so for clauses that have none", () => {
    const sat = new Sat();
    const [a, b, c] = [sat.newVar(), sat.newVar(), sat.newVar()];
    sat.addClause([a, b]);
    sat.addClause([-a, c]);
    sat.addClause([-b, c]);
    expect(sat.solve()).toBe("sat");
    expect(sat.modelValue(c)).toBe(true);
    sat.addClause([-c]);
    expect(sat.solve()).toBe("unsat");
    // Once it cannot be met it stays so.
    expect(sat.addClause([a])).toBe(false);
    expect(sat.solve()).toBe("unsat");
  });

  it("refuses the pigeonhole: five pigeons, four holes", () => {
    const sat = new Sat();
    const hole = Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => sat.newVar()));
    for (const pigeon of hole) sat.addClause(pigeon);
    for (let h = 0; h < 4; h += 1) for (let p = 0; p < 5; p += 1) for (let q = p + 1; q < 5; q += 1) sat.addClause([-hole[p]![h]!, -hole[q]![h]!]);
    expect(sat.solve()).toBe("unsat");
    expect(sat.conflicts).toBeGreaterThan(0);
  });

  it("counts the models of random clauses as a search of every setting does, by ruling each one out", () => {
    const random = seededRandom(7);
    for (let round = 0; round < 60; round += 1) {
      const n = 4 + Math.floor(random() * 6);
      const clauses = Array.from({ length: 2 + Math.floor(random() * 3 * n), }, () => {
        const width = 1 + Math.floor(random() * 3);
        return Array.from({ length: width }, () => (random() < 0.5 ? -1 : 1) * (1 + Math.floor(random() * n)));
      });
      expect(countModels(n, clauses), `round ${round}`).toBe(bruteForce(n, clauses));
    }
  });

  it("gives up with \"unknown\" past the dead ends it is allowed, and the same clauses give the same count every time", () => {
    const build = () => {
      const sat = new Sat();
      const hole = Array.from({ length: 8 }, () => Array.from({ length: 7 }, () => sat.newVar()));
      for (const pigeon of hole) sat.addClause(pigeon);
      for (let h = 0; h < 7; h += 1) for (let p = 0; p < 8; p += 1) for (let q = p + 1; q < 8; q += 1) sat.addClause([-hole[p]![h]!, -hole[q]![h]!]);
      return sat;
    };
    const limited = build();
    expect(limited.solve(20)).toBe("unknown");
    const [one, other] = [build(), build()];
    one.solve();
    other.solve();
    expect(one.conflicts).toBe(other.conflicts);
    expect(one.decisions).toBe(other.decisions);
  });
});
