import { describe, expect, it } from "vitest";

import { checkTsunagiAnswer } from "./check.ts";
import { CELL_BLOCKED, decodeLayout } from "./code.ts";
import { challengesOf } from "./ladder.ts";
import { seededRandom } from "./random.ts";
import { MOST_PAIRS, reducedCandidate, type ReduceOptions } from "./reduce.ts";
import { countSolutions, countSolutionsOfLevel } from "./solve.ts";

/**
 * MAKING BOARDS BY TAKING CLUES AWAY (`reduce.ts`): the boards come out with exactly one
 * answer, proved from a search of the solver's own, in every kind the level scripts ask for.
 */
function made(size: number, seed: number, options: ReduceOptions) {
  const random = seededRandom(seed);
  for (let tries = 0; tries < 60; tries += 1) {
    const board = reducedCandidate(size, random, { budget: 4000, ...options });
    if (board !== null) return board;
  }
  throw new Error(`no ${size}×${size} board of ${JSON.stringify(options)}`);
}

describe("a board made by taking clues away", () => {
  it("has exactly one answer, which the check takes, however the search is made", () => {
    const board = made(9, 1, {});
    const layout = decodeLayout(board.layout, 9)!;
    expect(layout.ends).toHaveLength(board.pairs);
    expect(countSolutions(layout, 2).count).toBe(1);
    expect(countSolutionsOfLevel(layout, board.answer).count).toBe(1);
    expect(checkTsunagiAnswer(9, board.layout, board.answer)).toEqual({ ok: true });
  });

  it("is the same board for the same seed, and another for another", () => {
    const [a, b, c] = [made(8, 5, {}), made(8, 5, {}), made(8, 6, {})];
    expect(a.layout).toBe(b.layout);
    expect(a.layout).not.toBe(c.layout);
  });

  it("can have blocked cells, a board that wraps, waypoints and portals, each as the layout says", () => {
    const blocked = made(9, 2, { blockedCount: 4 });
    expect(blocked.blocked).toBe(4);
    expect(decodeLayout(blocked.layout, 9)!.cells.filter((cell) => cell === CELL_BLOCKED)).toHaveLength(4);
    expect(challengesOf(blocked.layout)).toContain("walls");
    const wrapped = made(8, 3, { wrap: true });
    expect(decodeLayout(wrapped.layout, 8)!.wrap).toBe(true);
    expect(countSolutions(decodeLayout(wrapped.layout, 8)!, 2).count).toBe(1);
    const marked = made(9, 4, { waypoints: 2 });
    expect(decodeLayout(marked.layout, 9)!.waypoints.size).toBe(2);
    expect(checkTsunagiAnswer(9, marked.layout, marked.answer)).toEqual({ ok: true });
    const portal = made(8, 7, { portals: 2 });
    expect(decodeLayout(portal.layout, 8)!.portalPairs).toHaveLength(2);
  });

  it("is never more lines than there are characters to name them, nor more than asked for", () => {
    expect(MOST_PAIRS).toBe(82);
    const random = seededRandom(11);
    for (let tries = 0; tries < 12; tries += 1) {
      const board = reducedCandidate(9, random, { budget: 3000, most: 6 });
      if (board !== null) expect(board.pairs).toBeLessThanOrEqual(6);
    }
  });

  it("keeps a board of thirty-six lines or more free of waypoints, which its small letters name as stones", () => {
    const random = seededRandom(13);
    for (let tries = 0; tries < 6; tries += 1) {
      const board = reducedCandidate(14, random, { budget: 1500, waypoints: 3 });
      if (board !== null) expect(board.pairs).toBeLessThan(36);
    }
  });
});
