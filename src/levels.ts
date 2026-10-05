import type { LevelRow, TsunagiSet } from "./levelCounts.ts";
import { TSUNAGI_SIZES } from "./levelCounts.ts";

export * from "./levelCounts.ts";

/**
 * EVERY SIZE'S LEVELS, LOADED WHEN ASKED: `@johnmorrisdotca/tsunagi/levels`.
 * Each size is its own module, fetched only when that size is loaded, so a
 * page playing 5×5 never carries the other sizes. A page that wants one size
 * and nothing else can import it directly (`@johnmorrisdotca/tsunagi/levels-5`).
 */

const loaded = new Map<number, readonly LevelRow[]>();

async function importSize(size: number): Promise<readonly LevelRow[]> {
  // Named one by one, so a bundler splits each size into its own chunk.
  if (size === 4) return (await import("./levels/size4.data.ts")).TSUNAGI_4;
  if (size === 5) return (await import("./levels/size5.data.ts")).TSUNAGI_5;
  if (size === 6) return (await import("./levels/size6.data.ts")).TSUNAGI_6;
  if (size === 7) return (await import("./levels/size7.data.ts")).TSUNAGI_7;
  if (size === 8) return (await import("./levels/size8.data.ts")).TSUNAGI_8;
  if (size === 9) return (await import("./levels/size9.data.ts")).TSUNAGI_9;
  if (size === 10) return (await import("./levels/size10.data.ts")).TSUNAGI_10;
  if (size === 11) return (await import("./levels/size11.data.ts")).TSUNAGI_11;
  if (size === 12) return (await import("./levels/size12.data.ts")).TSUNAGI_12;
  if (size === 13) return (await import("./levels/size13.data.ts")).TSUNAGI_13;
  if (size === 14) return (await import("./levels/size14.data.ts")).TSUNAGI_14;
  if (size === 15) return (await import("./levels/size15.data.ts")).TSUNAGI_15;
  if (size === 20) return (await import("./levels/size20.data.ts")).TSUNAGI_20;
  if (size === 25) return (await import("./levels/size25.data.ts")).TSUNAGI_25;
  if (size === 30) return (await import("./levels/size30.data.ts")).TSUNAGI_30;
  throw new Error(`No Tsunagi at ${size}×${size}.`);
}

const loadedPortals = new Map<number, readonly LevelRow[]>();

/** The portal levels of a size: all sizes are one module, so a page that wants any wants a few kilobytes more than one size. */
async function importPortalSize(size: number): Promise<readonly LevelRow[]> {
  const levels = (await import("./levels/portals.data.ts")).TSUNAGI_PORTAL_LEVELS[size];
  if (levels === undefined) throw new Error(`No Tsunagi with portals at ${size}×${size}.`);
  return levels;
}

/** A size's levels in a set, loaded once and kept: the first set's by default, or the ones with portals. */
export async function loadTsunagiLevels(size: number, set: TsunagiSet = "classic"): Promise<readonly LevelRow[]> {
  const kept = set === "portals" ? loadedPortals : loaded;
  const already = kept.get(size);
  if (already !== undefined) return already;
  const levels = set === "portals" ? await importPortalSize(size) : await importSize(size);
  kept.set(size, levels);
  return levels;
}

/** Every size's levels of the first set, loaded. */
export async function loadEveryTsunagiLevel(): Promise<void> {
  await Promise.all(TSUNAGI_SIZES.map((size) => loadTsunagiLevels(size)));
}

/** A size already loaded in a set, or a refusal: nothing answers for a list it does not have. */
export function tsunagiLevelsOf(size: number, set: TsunagiSet = "classic"): readonly LevelRow[] {
  const levels = (set === "portals" ? loadedPortals : loaded).get(size);
  if (levels === undefined) throw new Error(`The ${size}×${size} Tsunagi ${set === "portals" ? "portal " : ""}levels have not been loaded (loadTsunagiLevels).`);
  return levels;
}

/** The level a layout is, at a loaded size and set, or null for a layout no level has. */
export function tsunagiLevelOf(size: number, givens: string, set: TsunagiSet = "classic"): number | null {
  const at = tsunagiLevelsOf(size, set).findIndex(([layout]) => layout === givens);
  return at === -1 ? null : at + 1;
}
