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
export const TSUNAGI_SIZES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30] as const;

/**
 * How many levels each size has, read without loading the size. Sixteen
 * blocks of sixteen (`levelBlocks.ts`); twelve at 4×4, where the generator
 * runs out of distinct boards with one answer before two hundred; eight at
 * 10×10 and 12×12 and four at 11×11, whose boards are slow to find and to
 * prove on every build; eight at 13×13, 14×14 and 15×15, found and proved by a
 * solver that learns from its dead ends (`solveSat.ts`); four at 20×20, 25×25
 * and 30×30, made by taking clues away (`reduce.ts`).
 */
export const TSUNAGI_LEVEL_COUNTS: Record<number, number> = { 4: 192, 5: 256, 6: 256, 7: 256, 8: 256, 9: 256, 10: 128, 11: 64, 12: 128, 13: 128, 14: 128, 15: 128, 20: 64, 25: 64, 30: 64 };

/**
 * A second set of levels, boards with portals (`code.ts`): a line goes in at one
 * ring and out of the other. Their own sizes and their own two blocks of sixteen a
 * size, opened one after another like the first set's, and numbered from 1 in their
 * own set; a record that keeps a level by one number (`levelSeed`) keeps a portal
 * level as `TSUNAGI_PORTAL_SEED` and its number, which no level of the first set
 * reaches.
 */
export const TSUNAGI_PORTAL_SIZES = [5, 6, 7, 8, 9, 10, 12, 15] as const;
export const TSUNAGI_PORTAL_COUNTS: Record<number, number> = { 5: 32, 6: 32, 7: 32, 8: 32, 9: 32, 10: 32, 12: 32, 15: 32 };

/** Which set of levels: the ones from 4×4 up, or the ones with portals. */
export type TsunagiSet = "classic" | "portals";

/** A portal level's number in a record that keeps a level by one number: this and its number in its own set, past every level of the first. */
export const TSUNAGI_PORTAL_SEED = 1000;

/** The number a record keeps a level by: its own for the first set, `TSUNAGI_PORTAL_SEED` and its number for the portals. */
export function levelSeed(set: TsunagiSet, level: number): number {
  return set === "portals" ? TSUNAGI_PORTAL_SEED + level : level;
}

/** The set and the number in it a record's number names. */
export function setOfSeed(seed: number): { set: TsunagiSet; level: number } {
  return seed > TSUNAGI_PORTAL_SEED ? { set: "portals", level: seed - TSUNAGI_PORTAL_SEED } : { set: "classic", level: seed };
}

/** How many levels a size has in a set; zero for a size the set has none at. */
export function levelCountOf(size: number, set: TsunagiSet = "classic"): number {
  return (set === "portals" ? TSUNAGI_PORTAL_COUNTS[size] : TSUNAGI_LEVEL_COUNTS[size]) ?? 0;
}

/** One level: its layout and its one answer, each a code (`code.ts`). */
export type LevelRow = readonly [string, string];

/** The third of a size a level sits in. */
export type TsunagiBand = "easy" | "medium" | "hard";

/** Whether a number is a level this size has. */
export function isTsunagiLevel(size: number, level: number, set: TsunagiSet = "classic"): boolean {
  const count = levelCountOf(size, set);
  return count > 0 && Number.isInteger(level) && level >= 1 && level <= count;
}

/** Which third of a size a level sits in: its first third easy, its middle medium, its last hard. */
export function tsunagiBand(size: number, level: number, set: TsunagiSet = "classic"): TsunagiBand {
  const count = levelCountOf(size, set) || 256;
  const third = (level - 1) / count;
  return third < 1 / 3 ? "easy" : third < 2 / 3 ? "medium" : "hard";
}

/**
 * The levels that are open, given the ones solved: the first block of sixteen
 * always, and each block after it once every level of the block before is
 * solved.
 */
export function openTsunagiLevels(size: number, solved: ReadonlySet<number>, set: TsunagiSet = "classic"): number {
  const count = levelCountOf(size, set);
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
export function nextTsunagiLevel(size: number, solved: ReadonlySet<number>, set: TsunagiSet = "classic"): number {
  const open = openTsunagiLevels(size, solved, set);
  for (let level = 1; level <= open; level += 1) if (!solved.has(level)) return level;
  return open;
}

/**
 * The lowest level not yet solved, or null when every level of the size is.
 * It is always open: a block opens only once the block before is all solved,
 * so the first gap is in the open blocks. Nobody is sent past a level they
 * have not finished.
 */
export function firstUnsolvedTsunagiLevel(size: number, solved: ReadonlySet<number>, set: TsunagiSet = "classic"): number | null {
  const count = levelCountOf(size, set);
  for (let level = 1; level <= count; level += 1) if (!solved.has(level)) return level;
  return null;
}
