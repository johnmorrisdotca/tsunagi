import type { LevelRow } from "./levelCounts.ts";
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
  throw new Error(`No Tsunagi at ${size}×${size}.`);
}

/** A size's levels, loaded once and kept. */
export async function loadTsunagiLevels(size: number): Promise<readonly LevelRow[]> {
  const already = loaded.get(size);
  if (already !== undefined) return already;
  const levels = await importSize(size);
  loaded.set(size, levels);
  return levels;
}

/** Every size's levels, loaded. */
export async function loadEveryTsunagiLevel(): Promise<void> {
  await Promise.all(TSUNAGI_SIZES.map((size) => loadTsunagiLevels(size)));
}

/** A size already loaded, or a refusal: nothing answers for a list it does not have. */
export function tsunagiLevelsOf(size: number): readonly LevelRow[] {
  const levels = loaded.get(size);
  if (levels === undefined) throw new Error(`The ${size}×${size} Tsunagi levels have not been loaded (loadTsunagiLevels).`);
  return levels;
}

/** The level a layout is, at a loaded size, or null for a layout no level has. */
export function tsunagiLevelOf(size: number, givens: string): number | null {
  const at = tsunagiLevelsOf(size).findIndex(([layout]) => layout === givens);
  return at === -1 ? null : at + 1;
}
