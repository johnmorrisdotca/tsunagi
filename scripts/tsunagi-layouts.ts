/**
 * THE LAYOUTS OF EVERY LEVEL, ON THEIR OWN: `node scripts/tsunagi-layouts.ts`.
 *
 * A server that checks a solve, or lists who solved which level, needs to know a
 * level by its board and never by its answer, and the answers are half of every
 * size's file (the 30×30 levels alone are 117 KB, 58 of them answers). This writes
 * `src/levels/layouts.data.ts`, the first of every level's two strings and nothing
 * else, so that such a server carries a third of the bytes. `layouts.test.ts`
 * fails when it is not what the level files say, so it is run after any script that
 * writes one of them.
 */
import { writeFileSync } from "node:fs";

import { TSUNAGI_PORTAL_SIZES, TSUNAGI_SIZES } from "../src/levelCounts.ts";
import { loadTsunagiLevels } from "../src/levels.ts";

const classic: Record<number, string[]> = {};
for (const size of TSUNAGI_SIZES) classic[size] = (await loadTsunagiLevels(size)).map(([layout]) => layout);
const portals: Record<number, string[]> = {};
for (const size of TSUNAGI_PORTAL_SIZES) portals[size] = (await loadTsunagiLevels(size, "portals")).map(([layout]) => layout);

const table = (all: Record<number, string[]>) =>
  Object.entries(all).flatMap(([size, layouts]) => [`  ${size}: [`, ...layouts.map((layout) => `    "${layout}",`), "  ],"]);

writeFileSync(
  "src/levels/layouts.data.ts",
  [
    "/**",
    " * EVERY LEVEL'S BOARD WITHOUT ITS ANSWER, by size and in level order: what a server needs to know",
    " * a level when it checks a solve or lists who solved which level. `@johnmorrisdotca/tsunagi/layouts`.",
    " *",
    " * WRITTEN BY `node scripts/tsunagi-layouts.ts`, NEVER BY HAND, from the level files; `layouts.test.ts`",
    " * fails when it is not what they say.",
    " */",
    "export const TSUNAGI_LAYOUTS: Readonly<Record<number, readonly string[]>> = {",
    ...table(classic),
    "};",
    "",
    "/** The levels with portals, by size. */",
    "export const TSUNAGI_PORTAL_LAYOUTS: Readonly<Record<number, readonly string[]>> = {",
    ...table(portals),
    "};",
    "",
  ].join("\n"),
);
console.log(`${Object.values(classic).flat().length} layouts, ${Object.values(portals).flat().length} with portals`);
