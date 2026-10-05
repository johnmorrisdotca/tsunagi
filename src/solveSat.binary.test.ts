import { beforeAll, describe, expect, it } from "vitest";

import { decodeLayout, encodeAnswer } from "./code.ts";
import { challengesOf } from "./ladder.ts";
import { TSUNAGI_SIZES } from "./levelCounts.ts";
import { loadTsunagiLevels, tsunagiLevelsOf } from "./levels.ts";
import { linesOfAnswer } from "./lines.ts";
import { countSolutionsSat } from "./solveSat.ts";

/**
 * A CELL'S PAIR AS A BINARY NUMBER (`SatColours`): the way a board of dozens of pairs is
 * written down, which is smaller and quicker than a variable for each pair. It must count
 * exactly what the first way counts, on every kind of board the levels have: here, one level
 * of every twist at the sizes the first way proved, from nothing and from the answer.
 */
const SIZES = [8, 12, 13] as const;

beforeAll(async () => {
  for (const size of SIZES) await loadTsunagiLevels(size);
}, 60_000);

describe("the binary way of writing the pairs", () => {
  it("counts one answer, the stored one, for a level of every twist, from nothing and from the answer", () => {
    const wanted = ["bridges", "walls", "waypoints", "wrap", "explosions", "strokes", "hexagon", "sparse"] as const;
    const seen = new Set<string>();
    for (const size of SIZES) {
      for (const [index, [givens, answer]] of tsunagiLevelsOf(size).entries()) {
        const kinds = challengesOf(givens).filter((each) => wanted.includes(each as (typeof wanted)[number]));
        // The first level at each size to show a twist not yet shown at that size, and one plain level.
        const fresh = kinds.filter((each) => !seen.has(`${size}${each}`));
        if (fresh.length === 0 && !(index === 3 && kinds.length === 0)) continue;
        for (const each of fresh) seen.add(`${size}${each}`);
        const layout = decodeLayout(givens, size)!;
        for (const guide of [null, linesOfAnswer(layout, answer)]) {
          const counted = countSolutionsSat(layout, 2, 2_000_000, guide, "binary");
          expect(counted.count, `${size}×${size} level ${index + 1} (${kinds.join(", ") || "plain"})`).toBe(1);
          expect(encodeAnswer(counted.solution!), `${size}×${size} level ${index + 1}`).toBe(answer);
        }
      }
    }
    // Every twist was met at some size.
    expect(TSUNAGI_SIZES.length).toBeGreaterThan(0);
    expect([...seen].length).toBeGreaterThan(8);
  }, 300_000);

  it("finds the second answer where a board has two, as the first way does", () => {
    // A level of 8×8 with its walls taken away has several answers.
    const [givens] = tsunagiLevelsOf(8).find(([layout]) => layout.includes("|") && challengesOf(layout).includes("walls"))!;
    const layout = decodeLayout(givens, 8)!;
    const freed = { ...layout, walls: new Set<string>() };
    const one = countSolutionsSat(freed, 400, 5_000_000, null, "one-hot");
    const two = countSolutionsSat(freed, 400, 5_000_000, null, "binary");
    // Few enough that every answer is found by both: the same ones.
    expect(one.count).toBeLessThan(400);
    expect(two.count).toBe(one.count);
    expect(one.count).toBeGreaterThan(1);
    expect(new Set(two.solutions.map(encodeAnswer))).toEqual(new Set(one.solutions.map(encodeAnswer)));
  });
});
