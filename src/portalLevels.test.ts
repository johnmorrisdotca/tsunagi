import { beforeAll, describe, expect, it } from "vitest";

import { checkTsunagiAnswer } from "./check.ts";
import { decodeLayout, encodeAnswer, hexNeighboursOf, neighboursOf } from "./code.ts";
import { difficultyScores, measureSolved, type LevelMeasure } from "./difficulty.ts";
import { symmetryKey } from "./generate.ts";
import { challengesOf } from "./ladder.ts";
import { levelCountOf, TSUNAGI_PORTAL_COUNTS, TSUNAGI_PORTAL_SEED, TSUNAGI_PORTAL_SIZES, levelSeed, setOfSeed, isTsunagiLevel, openTsunagiLevels, tsunagiBand } from "./levelCounts.ts";
import { loadTsunagiLevels, tsunagiLevelOf, tsunagiLevelsOf } from "./levels.ts";
import { TSUNAGI_PORTAL_MARKS } from "./levels/marks.data.ts";
import { countSolutionsOfLevel, type SolveCount } from "./solve.ts";

/**
 * THE PORTAL LEVELS, PROVED AGAIN ON EVERY BUILD: each size's levels from a search started
 * from its own answer, which must find no other; the boards of the first block have one
 * portal and the second's two or three; and the order and the marks are the measure's.
 */
describe.each(TSUNAGI_PORTAL_SIZES.map((size) => [size]))("the portal levels at %i×%i", (size) => {
  let solves: SolveCount[] = [];
  beforeAll(async () => {
    await loadTsunagiLevels(size, "portals");
    solves = tsunagiLevelsOf(size, "portals").map(([givens, answer]) => countSolutionsOfLevel(decodeLayout(givens, size)!, answer));
  }, 600_000);

  it("has as many levels as the counts say, in whole blocks of sixteen", () => {
    expect(tsunagiLevelsOf(size, "portals").length).toBe(TSUNAGI_PORTAL_COUNTS[size]);
    expect(tsunagiLevelsOf(size, "portals").length % 16).toBe(0);
  });

  it("proves every level has exactly one answer, the stored one, filling the board, and that the check takes it", () => {
    for (const [index, [givens, answer]] of tsunagiLevelsOf(size, "portals").entries()) {
      const solved = solves[index]!;
      expect(solved.count, `level ${index + 1} has ${solved.count} answers`).toBe(1);
      expect(encodeAnswer(solved.solution!), `level ${index + 1}'s stored answer is not its answer`).toBe(answer);
      expect(answer).not.toContain(".");
      expect(checkTsunagiAnswer(size, givens, answer)).toEqual({ ok: true });
    }
  });

  it("gives the first block one portal a board and the second two or three", () => {
    for (const [index, [givens]] of tsunagiLevelsOf(size, "portals").entries()) {
      const layout = decodeLayout(givens, size)!;
      expect(challengesOf(givens), `level ${index + 1}`).toContain("portals");
      if (index < 16) expect(layout.portalPairs, `level ${index + 1}`).toHaveLength(1);
      else expect(layout.portalPairs.length, `level ${index + 1}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("never sets a pair's two marbles side by side, nor a line shorter than three cells, nor a board twice", () => {
    const levels = tsunagiLevelsOf(size, "portals");
    for (const [index, [givens, answer]] of levels.entries()) {
      const layout = decodeLayout(givens, size)!;
      for (const [a, b] of layout.ends) {
        expect(layout.hex ? hexNeighboursOf(size, a) : neighboursOf(size, a), `level ${index + 1}: a pair sits side by side`).not.toContain(b);
        expect([...answer].filter((letter) => letter === answer[a]).length).toBeGreaterThanOrEqual(3);
      }
    }
    const keys = levels.map(([givens]) => symmetryKey(givens, size));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("names each level by its layout, files it in a third of the set, and opens its blocks one after another", () => {
    const levels = tsunagiLevelsOf(size, "portals");
    expect(tsunagiLevelOf(size, levels[11]![0], "portals")).toBe(12);
    expect(tsunagiBand(size, 1, "portals")).toBe("easy");
    expect(tsunagiBand(size, levels.length, "portals")).toBe("hard");
    expect(isTsunagiLevel(size, levels.length, "portals")).toBe(true);
    expect(isTsunagiLevel(size, levels.length + 1, "portals")).toBe(false);
    expect(openTsunagiLevels(size, new Set(), "portals")).toBe(16);
    expect(openTsunagiLevels(size, new Set(Array.from({ length: 16 }, (_, at) => at + 1)), "portals")).toBe(32);
  });

  it("marks every level 1 to 5 by its measured score among the size's portal levels, each block easiest first", () => {
    const measured: LevelMeasure[] = tsunagiLevelsOf(size, "portals").map(([layout, answer], at) => measureSolved(layout, answer, size, solves[at]!)!);
    const scores = difficultyScores(measured, size);
    expect(TSUNAGI_PORTAL_MARKS[size]).toBe(scores.map((score) => String(Math.min(5, 1 + Math.floor(score / 20)))).join(""));
    // Within a block, no level is easier by the measure than the one before it.
    for (const [from, to] of [[0, 16], [16, 32]] as const) {
      const block = difficultyScores(measured.slice(from, to), size);
      for (let at = 1; at < block.length; at += 1) expect(block[at]!, `level ${from + at + 1}`).toBeGreaterThanOrEqual(block[at - 1]!);
    }
  });
});

describe("a portal level in a record that keeps a level by one number", () => {
  it("is kept as the portal seed and its number, which no level of the first set reaches", () => {
    expect(levelSeed("classic", 7)).toBe(7);
    expect(levelSeed("portals", 7)).toBe(TSUNAGI_PORTAL_SEED + 7);
    expect(setOfSeed(7)).toEqual({ set: "classic", level: 7 });
    expect(setOfSeed(TSUNAGI_PORTAL_SEED + 7)).toEqual({ set: "portals", level: 7 });
    expect(levelCountOf(6, "portals")).toBe(TSUNAGI_PORTAL_COUNTS[6]);
    expect(levelCountOf(11, "portals")).toBe(0);
    expect(Math.max(...Object.values({ 4: 192, 5: 256, 6: 256 }))).toBeLessThan(TSUNAGI_PORTAL_SEED);
  });
});
