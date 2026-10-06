import { describe, expect, it } from "vitest";

import { TSUNAGI_PORTAL_SIZES, TSUNAGI_SIZES } from "./levelCounts.ts";
import { loadTsunagiLevels } from "./levels.ts";
import { TSUNAGI_LAYOUTS, TSUNAGI_PORTAL_LAYOUTS } from "./levels/layouts.data.ts";

describe("the layouts on their own (`@johnmorrisdotca/tsunagi/layouts`)", () => {
  it("are the first string of every level of every size, in order, and nothing else (node scripts/tsunagi-layouts.ts writes them)", async () => {
    expect(Object.keys(TSUNAGI_LAYOUTS).map(Number)).toEqual([...TSUNAGI_SIZES]);
    for (const size of TSUNAGI_SIZES) expect(TSUNAGI_LAYOUTS[size], `${size}×${size}`).toEqual((await loadTsunagiLevels(size)).map(([layout]) => layout));
  });

  it("are the portal levels' too", async () => {
    expect(Object.keys(TSUNAGI_PORTAL_LAYOUTS).map(Number)).toEqual([...TSUNAGI_PORTAL_SIZES]);
    for (const size of TSUNAGI_PORTAL_SIZES) expect(TSUNAGI_PORTAL_LAYOUTS[size], `${size}×${size} with portals`).toEqual((await loadTsunagiLevels(size, "portals")).map(([layout]) => layout));
  });
});
