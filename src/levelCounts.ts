import { TSUNAGI_BLOCK } from "./levelBlocks.ts";

/**
 * TSUNAGI'S LEVELS, COUNTED: which sizes there are, how many levels each has,
 * and which of them a player has opened. The levels themselves are data, each
 * size its own import (`@johnmorrisdotca/tsunagi/levels-7`, or every size
 * through `@johnmorrisdotca/tsunagi/levels`), so nothing here carries a board.
 *
 * A level is not made from a seed: level 12 at 7×7 is one board for every
 * player on every day, so a time on it can be compared with anybody's.
 */
export const TSUNAGI_SIZES = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * How many levels each size has, read without loading the size. Sixteen
 * blocks of sixteen (`levelBlocks.ts`); twelve at 4×4, where the generator
 * runs out of distinct boards with one answer before two hundred; eight at
 * 10×10 and 12×12 and four at 11×11, whose boards are slow to find and to
 * prove on every build.
 */
export const TSUNAGI_LEVEL_COUNTS: Record<number, number> = { 4: 192, 5: 256, 6: 256, 7: 256, 8: 256, 9: 256, 10: 128, 11: 64, 12: 128 };

/** One level: its layout and its one answer, each a code (`code.ts`). */
export type LevelRow = readonly [string, string];

/** The third of a size a level sits in. */
export type TsunagiBand = "easy" | "medium" | "hard";

/** Whether a number is a level this size has. */
export function isTsunagiLevel(size: number, level: number): boolean {
  const count = TSUNAGI_LEVEL_COUNTS[size];
  return count !== undefined && Number.isInteger(level) && level >= 1 && level <= count;
}

/** Which third of a size a level sits in: its first third easy, its middle medium, its last hard. */
export function tsunagiBand(size: number, level: number): TsunagiBand {
  const count = TSUNAGI_LEVEL_COUNTS[size] ?? 256;
  const third = (level - 1) / count;
  return third < 1 / 3 ? "easy" : third < 2 / 3 ? "medium" : "hard";
}

/**
 * The levels that are open, given the ones solved: the first block of sixteen
 * always, and each block after it once every level of the block before is
 * solved.
 */
export function openTsunagiLevels(size: number, solved: ReadonlySet<number>): number {
  const count = TSUNAGI_LEVEL_COUNTS[size] ?? 0;
  let open = Math.min(TSUNAGI_BLOCK, count);
  while (open < count) {
    let blockDone = true;
    for (let level = open - TSUNAGI_BLOCK + 1; level <= open; level += 1) if (!solved.has(level)) blockDone = false;
    if (!blockDone) break;
    open = Math.min(open + TSUNAGI_BLOCK, count);
  }
  return open;
}

/** The level to open on: the first open one not yet solved, or the last open one when every open level is solved. */
export function nextTsunagiLevel(size: number, solved: ReadonlySet<number>): number {
  const open = openTsunagiLevels(size, solved);
  for (let level = 1; level <= open; level += 1) if (!solved.has(level)) return level;
  return open;
}

/**
 * The lowest level not yet solved, or null when every level of the size is.
 * It is always open: a block opens only once the block before is all solved,
 * so the first gap is in the open blocks. Nobody is sent past a level they
 * have not finished.
 */
export function firstUnsolvedTsunagiLevel(size: number, solved: ReadonlySet<number>): number | null {
  const count = TSUNAGI_LEVEL_COUNTS[size] ?? 0;
  for (let level = 1; level <= count; level += 1) if (!solved.has(level)) return level;
  return null;
}
