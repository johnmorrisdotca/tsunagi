import type { TsunagiBoardLook } from "./boards.ts";
import type { TsunagiColour } from "./colours.ts";
import type { TsunagiMountOptions } from "./mount.ts";

/**
 * THE `<tsunagi-board>` ELEMENT: a playable Tsunagi board in a tag, with no
 * framework. `@johnmorrisdotca/tsunagi/element/define` defines it; this entry
 * holds the class alone, to extend or to define under another name. Safe to
 * import on a server, where there is no page: the class then extends nothing.
 *
 * ```html
 * <tsunagi-board size="6" level="3" marks="numbers" fill="lines"></tsunagi-board>
 * <tsunagi-board size="5" givens="A..B.…" answer="AAAB…" cheats></tsunagi-board>
 * ```
 *
 * Attributes (each is read again when it changes):
 *  - `size` and `level`: the level to play, from the package's own levels, fetched when asked; `set="portals"`
 *    for the levels with portals. Or `size` and `givens` (with `answer` if there is one): a layout of your own.
 *  - `marks`: `colours` (default) or `numbers`. `fill`: `marbles` (the dots, default) or `lines`.
 *  - `colour-set`: `marble` (default), `bright`, `colour-blind` or `soft`. `board`: `paper` (default), `wood`,
 *    `green`, `blue`, `red` or `black`. `coordinates`: row numbers and column letters.
 *  - `explosions`: `on` (default), `soft` or `off`. `cheats`: offer Cheat (needs an answer, which a level has).
 *  - `controls="off"`: only the board. `chips`: the level's difficulty and challenges. `zoom`: `auto`, `on` or `off`.
 *  - `progress`: lines kept from a game half played (the `code` of an event), read when the level loads.
 *  - `lang`: `en` or `ja`, or the page's.
 *
 * It fires `tsunagi-change`, `tsunagi-stroke`, `tsunagi-explosion` and `tsunagi-solve` (see `mountTsunagi`), and has
 * the methods `undo()`, `restart()`, `check()`, `cheat()` and `fit()`. Nothing in it can be selected, and its box
 * stays one steady square whatever is drawn.
 */
export const ElementBase: typeof HTMLElement =
  typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

export const isOn = (value: string | null): boolean =>
  value !== null && !["false", "off", "0", "no"].includes(value.trim().toLowerCase());
export const offAlias = (value: string | null): string | null =>
  value !== null && ["false", "no", "0"].includes(value.trim().toLowerCase()) ? "off" : value;
export const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  allowed.includes(value as T) ? (value as T) : undefined;

/** Every mounted-board option, kept complete by TypeScript and checked by the builder.
 * @example
 * ```ts
 * import { TSUNAGI_EMBED_OPTION_KEYS } from "@johnmorrisdotca/tsunagi/element";
 * console.log(typeof TSUNAGI_EMBED_OPTION_KEYS); // object
 * ```
 */
export const TSUNAGI_EMBED_OPTION_KEYS = Object.keys({
  size: true,
  givens: true,
  answer: true,
  level: true,
  set: true,
  lines: true,
  explosions: true,
  cheats: true,
  controls: true,
  chips: true,
  zoom: true,
  language: true,
  marks: true,
  fill: true,
  colours: true,
  board: true,
  coordinates: true,
  onChange: true,
  onStroke: true,
  onExplosion: true,
  onSolve: true,
} satisfies Record<keyof TsunagiMountOptions, boolean>);
/** Host callbacks and custom drawing palettes, which cannot be put in an attribute.
 * @example
 * ```ts
 * import type { TsunagiElementOptions } from "@johnmorrisdotca/tsunagi/element";
 * const options: TsunagiElementOptions = {};
 * console.log(Object.keys(options).length); // 0
 * ```
 */
export type TsunagiElementOptions = Pick<TsunagiMountOptions, "onChange" | "onStroke" | "onExplosion" | "onSolve"> & {
  colours?: readonly TsunagiColour[];
  board?: TsunagiBoardLook;
};
