import { beforeAll, describe, expect, it } from "vitest";

import { loadEveryTsunagiLevel, TSUNAGI_LEVEL_COUNTS, TSUNAGI_SIZES, tsunagiLevelsOf } from "./levels.ts";
import { TSUNAGI_RENUMBERED } from "./levels/renumbered.data.ts";
import { renumberedRecord } from "./renumber.ts";

/**
 * THE RENUMBERING OF 2026-09-26 KEEPS EVERY STORED THING ON ITS BOARD.
 *
 * The move is held to the levels as they now stand; a site that stored
 * runs by level number moved its own rows the same way, and holds its
 * migration to `renumbered.data.ts` itself.
 */
beforeAll(loadEveryTsunagiLevel);

describe("the renumbering", () => {
  // The sizes that had levels before the renumbering: 10×10 and 11×11 came after it, with nothing to move.
  const RENUMBERED = TSUNAGI_SIZES.filter((size) => TSUNAGI_RENUMBERED[size] !== undefined);

  it("covers every size that had levels then, 4×4 to 9×9", () => {
    expect(RENUMBERED).toEqual([4, 5, 6, 7, 8, 9]);
  });

  it.each(RENUMBERED.map((size) => [size]))("moves each of the hundred old %i×%i levels to its own new number, no two to one", (size) => {
    const to = TSUNAGI_RENUMBERED[size]!;
    expect(to).toHaveLength(100);
    expect(new Set(to).size).toBe(100);
    for (const level of to) {
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(TSUNAGI_LEVEL_COUNTS[size]!);
    }
  });

  it("put John's four straight rows, old 4×4 level 10, at level 1", () => {
    expect(TSUNAGI_RENUMBERED[4]![9]).toBe(1);
    expect(tsunagiLevelsOf(4)[0]![0]).toBe("A..AB..BC..CD..D");
  });

});

describe("a browser's record, moved", () => {
  it("carries a time on old level 10 to the board's new number, and drops a number the old order never had", () => {
    const moved = renumberedRecord(4, { 10: 5_000, 101: 9_000 });
    expect(moved).toEqual({ 1: 5_000 });
  });

  it("moves nothing for a size it has no move for", () => {
    expect(renumberedRecord(12, { 1: 1 })).toEqual({});
  });
});
