/**
 * THE LEVEL OF THE DAY. Tsunagi's levels are fixed, so "today's level" needs
 * no seed and no server: it is a pure function of the date and the size, the
 * same board for everybody on every machine, which is what lets two people
 * compare a time on it.
 *
 * A day is written `YYYY-MM-DD` and counted in UTC, so the level turns over at
 * the same moment worldwide. Each size has a level of its own for the day. A
 * size steps through its levels by a fixed stride that shares no factor with
 * any size's count of levels, so every level of a size comes up once before
 * any comes up again (128 days at 13×13, 256 at 7×7), and two neighbouring
 * days are far apart in the ladder rather than creeping up it.
 */
import { TSUNAGI_LEVEL_COUNTS } from "./levelCounts.ts";

/** A calendar date, `YYYY-MM-DD`. */
export type TsunagiDay = string;

const DAY_MS = 86_400_000;

/** Each day moves this many levels along a size's ladder, round to the start when it runs out. It is prime, and no size's count of levels is a multiple of it. Each size starts from a place of its own, so the sizes do not all stand at the same level on one day. */
export const TSUNAGI_DAILY_STRIDE = 97;

/** Whether a text is a real date written `YYYY-MM-DD`: 2026-02-30 is not. */
export function isTsunagiDay(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const at = Date.parse(`${text}T00:00:00Z`);
  return !Number.isNaN(at) && new Date(at).toISOString().slice(0, 10) === text;
}

/** The day a moment falls on, in UTC, or the same day if it is already written as one. Throws on a date that is not one. */
export function tsunagiDay(date: string | Date): TsunagiDay {
  const day = typeof date === "string" ? date : Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  if (!isTsunagiDay(day)) throw new RangeError(`tsunagi: ${String(typeof date === "string" ? date : "an invalid Date")} is not a day`);
  return day;
}

/**
 * The level of the day at a size: a whole number from 1 to that size's count of levels, or null for a size there
 * are no levels of. It ignores which levels a player has opened: today's level is open to everybody.
 */
export function dailyTsunagiLevel(size: number, date: string | Date): number | null {
  const count = TSUNAGI_LEVEL_COUNTS[size];
  if (count === undefined) return null;
  const days = Date.parse(`${tsunagiDay(date)}T00:00:00Z`) / DAY_MS;
  return ((days * TSUNAGI_DAILY_STRIDE + size * size * 2_654_435_761) % count) + 1;
}
