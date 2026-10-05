import type { TwistRole } from "../src/ladder.types.ts";

/**
 * The text of `src/levels/marks.data.ts`, which every level script writes: each level's
 * difficulty mark and each twist level's part in its block's lesson, for the first set of
 * levels, and the marks of the portal levels. One writer, so that a script that makes one
 * kind of level keeps what the others made.
 */
export function marksFile(marks: Record<number, string>, roles: Record<number, Record<number, TwistRole>>, portalMarks: Record<number, string>): string {
  return [
    "/**",
    " * EVERY TSUNAGI LEVEL'S DIFFICULTY, 1 TO 5: one digit a level, level 1 first,",
    " * from its measured score (`difficulty.ts`) among every level of its size —",
    " * the marks the row under a board shows. And each twist level's part in its",
    " * block's lesson (`twistRole`), so the board of levels and the row can say it",
    " * without loading a size's boards. The portal levels' marks are the same,",
    " * a size's among its own levels. Written by `node scripts/tsunagi-levels.ts`,",
    " * `tsunagi-levels-big.ts`, `tsunagi-levels-huge.ts` and `tsunagi-levels-portals.ts`,",
    " * never by hand; `difficulty.test.ts` and `ladder.test.ts` hold both to the levels.",
    " */",
    'import type { TwistRole } from "../ladder.types.ts";',
    "",
    "export const TSUNAGI_MARKS: Readonly<Record<number, string>> = {",
    ...Object.entries(marks).map(([size, digits]) => `  ${size}: "${digits}",`),
    "};",
    "",
    "export const TSUNAGI_ROLES: Readonly<Record<number, Readonly<Record<number, TwistRole>>>> = {",
    ...Object.entries(roles).map(([size, bySize]) => `  ${size}: ${JSON.stringify(bySize)},`),
    "};",
    "",
    "export const TSUNAGI_PORTAL_MARKS: Readonly<Record<number, string>> = {",
    ...Object.entries(portalMarks).map(([size, digits]) => `  ${size}: "${digits}",`),
    "};",
    "",
  ].join("\n");
}
