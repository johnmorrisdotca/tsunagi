import { describe, expect, it } from "vitest";

import { dailyTsunagiLevel, isTsunagiDay, TSUNAGI_DAILY_STRIDE, tsunagiDay } from "./daily.ts";
import { TSUNAGI_LEVEL_COUNTS, TSUNAGI_SIZES } from "./levelCounts.ts";

const dayAfter = (day: string, by: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + by * 86_400_000).toISOString().slice(0, 10);

describe("the level of the day", () => {
  it("is a level the size has, for every size, on any day", () => {
    for (const size of TSUNAGI_SIZES) for (let by = 0; by < 400; by += 1) {
      const level = dailyTsunagiLevel(size, dayAfter("2026-10-01", by));
      expect(Number.isInteger(level), `${size} ${by}`).toBe(true);
      expect(level!).toBeGreaterThanOrEqual(1);
      expect(level!).toBeLessThanOrEqual(TSUNAGI_LEVEL_COUNTS[size]!);
    }
  });

  it("is the same on every call, whether it is given a date's text or a moment of that day", () => {
    expect(dailyTsunagiLevel(7, "2026-10-01")).toBe(dailyTsunagiLevel(7, new Date("2026-10-01T23:59:59Z")));
    expect(dailyTsunagiLevel(7, "2026-10-01")).toBe(dailyTsunagiLevel(7, new Date("2026-10-01T00:00:00Z")));
    expect(dailyTsunagiLevel(7, "2026-10-01")).not.toBe(dailyTsunagiLevel(7, "2026-10-02"));
  });

  it("is pinned: these are the levels of 1 October 2026 at 4×4 to 15×15, and at 20×20, 25×25 and 30×30 (added 5 October 2026), so a change to the rule is a change that is seen", () => {
    expect(TSUNAGI_SIZES.map((size) => dailyTsunagiLevel(size, "2026-10-01"))).toEqual([104, 225, 124, 121, 216, 153, 60, 1, 40, 113, 28, 41, 40, 57, 28]);
  });

  it("visits every level of a size once before any comes round again", () => {
    for (const size of TSUNAGI_SIZES) {
      const count = TSUNAGI_LEVEL_COUNTS[size]!;
      const seen = new Set(Array.from({ length: count }, (_, by) => dailyTsunagiLevel(size, dayAfter("2026-01-01", by))));
      expect(seen.size, `${size}`).toBe(count);
    }
  });

  it("has a stride that shares no factor with any size's count of levels, which is what makes that so", () => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    for (const count of Object.values(TSUNAGI_LEVEL_COUNTS)) expect(gcd(TSUNAGI_DAILY_STRIDE, count)).toBe(1);
  });

  it("says null for a size there are no levels of, and refuses a day that is not one", () => {
    expect(dailyTsunagiLevel(3, "2026-10-01")).toBeNull();
    expect(() => dailyTsunagiLevel(7, "2026-02-30")).toThrow(RangeError);
    expect(() => dailyTsunagiLevel(7, new Date("nope"))).toThrow(RangeError);
    expect(() => tsunagiDay("tomorrow")).toThrow(RangeError);
  });

  it("reads a day as UTC, and knows a real date from an impossible one", () => {
    expect(tsunagiDay(new Date("2026-10-01T23:30:00-07:00"))).toBe("2026-10-02");
    expect(isTsunagiDay("2028-02-29")).toBe(true);
    expect(isTsunagiDay("2027-02-29")).toBe(false);
    expect(isTsunagiDay("2026-1-1")).toBe(false);
  });
});
