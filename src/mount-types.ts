import type { TsunagiBoardLook, TsunagiBoardName } from "./boards.ts";
import type { TsunagiColour, TsunagiColourSetName, TsunagiFill, TsunagiMarks } from "./colours.ts";
import type { TsunagiExplosionChoice, TsunagiGame, TsunagiHelp, TsunagiProgress } from "./game.ts";
import type { TsunagiSet } from "./levelCounts.ts";
import type { Lines } from "./lines.ts";
import { TSUNAGI_PLAY_STYLE } from "./playStyle.ts";
import type { TsunagiLanguage } from "./strings.ts";

/**
 * A PLAYABLE TSUNAGI BOARD IN ANY PAGE: `mountTsunagi(host, options)` draws a
 * level into an element and plays it by touch and mouse, the way itsutsu.com
 * does. Press a marble (or the end of a line) and drag to its partner; drag
 * back over a line to shorten it; tap a marble to clear its line; a line
 * dragged into another cuts the other back. Pointer events, captured on the
 * press so a drag that leaves the board still ends, with `touch-action: none` so
 * a finger drawing a line never scrolls the page. From 10×10 up the board is
 * looked at through a box with a zoom and move pad, the wheel and the box's
 * edge (`zoom`), never by scrolling the page.
 *
 * Under the board are Undo, Restart, Check and (if allowed) Cheat, a line of
 * progress and the lines a board's twists ask for: strokes left, the count to
 * the next explosion, what Check found. Every one is optional (`controls`), and
 * everything a button does is also a method of the returned handle. What happens
 * is told in events, on the host as DOM events and to the callbacks given:
 * `tsunagi-change` for every change to the lines, `tsunagi-stroke` for each
 * stroke, `tsunagi-explosion` for an explosion, and `tsunagi-solve` once, with
 * the answer ready for `checkTsunagiAnswer`.
 *
 * Needs a page. The rules it plays by are `game.ts`'s, the drawing is
 * `drawTsunagi`'s, and both are usable alone.
 */

/** What a board looks like: every option `drawTsunagi` takes that does not depend on the lines.
 *
 * @example
 * ```ts
 * import type { TsunagiLook } from "@johnmorrisdotca/tsunagi/play";
 *
 * const value: TsunagiLook = {marks:"numbers",fill:"lines",board:"paper"};
 * console.log(value);
 * ```
 */
export type TsunagiLook = {
  marks?: TsunagiMarks;
  fill?: TsunagiFill;
  colours?: TsunagiColourSetName | readonly TsunagiColour[];
  board?: TsunagiBoardName | TsunagiBoardLook;
  coordinates?: boolean;
};

/** What a mounted board tells of itself in every event.
 *
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { answerOf, decodeLayout, encodeLines, newTsunagiGame, noLines, tsunagiProgress } from "@johnmorrisdotca/tsunagi";
 * import type { TsunagiEventDetail } from "@johnmorrisdotca/tsunagi/play";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const lines = noLines(layout);
 * const game = newTsunagiGame(givens,4,{answer,cheats:true})!;
 * const value: TsunagiEventDetail = {lines,code:encodeLines(layout,lines),progress:tsunagiProgress(game),answer:answerOf(layout,lines),helped:null};
 * console.log(value);
 * ```
 */
export type TsunagiEventDetail = {
  /** The lines drawn so far. */
  lines: Lines;
  /** The lines as a short code, to keep a game half played (`decodeLines` brings them back). */
  code: string;
  progress: TsunagiProgress;
  /** The answer the lines make, in the answer's spelling: what `checkTsunagiAnswer` takes. */
  answer: string;
  helped: TsunagiHelp | null;
  /** What happened, for `tsunagi-explosion`: `boom` or `blast`, and the cells it took a line out of. */
  explosion?: { kind: "boom" | "blast"; cells: readonly number[] };
};

/** The puzzle, native display choices, controls and event callbacks for mounting a board.
 *
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import type { TsunagiMountOptions } from "@johnmorrisdotca/tsunagi/play";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const value: TsunagiMountOptions = {size:4,givens,answer,controls:true};
 * console.log(value);
 * ```
 */
export type TsunagiMountOptions = TsunagiLook & {
  /** The board's size: how many cells across. */
  size: number;
  /** The level's layout code. */
  givens: string;
  /** The level's one answer, as a code. With it a solve must be that answer, and Cheat can be offered. */
  answer?: string;
  /** Which level of its size this is, to show its difficulty and its place in its block. */
  level?: number;
  /** Which set of levels `level` is in: `classic` (the default) or `portals`. */
  set?: TsunagiSet;
  /** Lines to start from, to carry on a game kept half played. */
  lines?: Lines;
  /** Explosions as made (the default), softened or off. */
  explosions?: TsunagiExplosionChoice;
  /** Offer Cheat, which draws one unfinished line. Needs `answer`. Default false. */
  cheats?: boolean;
  /** The buttons and the lines of words under the board. Default true. */
  controls?: boolean;
  /** A row of chips under the board: the level's difficulty and each challenge on it, each with the line that explains it when pressed. Default false. */
  chips?: boolean;
  /** `auto` (the default): the zoom and move pad from 10×10 up. `off`: never. `on`: always. */
  zoom?: "auto" | "on" | "off";
  /** The language the words are in. Left out, the host's own `lang`, or the page's, and it follows the page's. */
  language?: TsunagiLanguage;
  onChange?: (detail: TsunagiEventDetail) => void;
  onStroke?: (detail: TsunagiEventDetail) => void;
  onExplosion?: (detail: TsunagiEventDetail) => void;
  onSolve?: (detail: TsunagiEventDetail) => void;
};

/** The mounted native board handle and its game, display, action and cleanup methods.
 *
 * @example
 * ```ts no-run
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import type { TsunagiMount } from "@johnmorrisdotca/tsunagi/play";
 * import { mountTsunagi } from "@johnmorrisdotca/tsunagi/play";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const host = document.createElement("div");
 * document.body.append(host);
 * const board: TsunagiMount | null = mountTsunagi(host,{size:4,givens,answer,controls:true});
 * console.log(board?.progress().pairs);
 * board?.destroy();
 * ```
 */
export type TsunagiMount = {
  readonly host: HTMLElement;
  /** The game as it stands. */
  game: () => TsunagiGame;
  progress: () => TsunagiProgress;
  /** Play another level (or the same one again, fresh). `lines` carries on a kept game. */
  load: (level: {
    size: number;
    givens: string;
    answer?: string;
    level?: number;
    set?: TsunagiSet;
    lines?: Lines;
  }) => void;
  /** Change how the board looks, or how it is played: marks, fill, colours, board, coordinates, explosions, cheats, language. A look takes effect at once; explosions and cheats from the next `load` or `restart`. */
  set: (
    changes: TsunagiLook & { explosions?: TsunagiExplosionChoice; cheats?: boolean; language?: TsunagiLanguage },
  ) => void;
  undo: () => void;
  restart: () => void;
  check: () => void;
  cheat: () => void;
  /** Zoom and move back to the whole board. */
  fit: () => void;
  /** Take the board down: its listeners, its timers and everything it put in the host. */
  destroy: () => void;
};

/** How long Check's flashing lasts and how long an explosion's burst shows, in milliseconds; the words stay until the board changes. */
export const FLASH_MS = 2400;
export const BLAST_MS = 1200;
/** Put the style in the page once: in the document's head, or in the shadow root the host is in.
 *
 * @param host - The DOM host for the native board or its scoped styles.
 * @returns Nothing; native scoped play styles are installed for the host.
 * @example
 * ```ts no-run
 * import { ensureTsunagiPlayStyle } from "@johnmorrisdotca/tsunagi/play";
 *
 * const host = document.createElement("div");
 * document.body.append(host);
 * ensureTsunagiPlayStyle(host);
 * console.log(host.tagName);
 * ```
 */
export function ensureTsunagiPlayStyle(host: Element): void {
  const root = host.getRootNode();
  const target: ParentNode =
    typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector("style[data-tsunagi-play]") !== null) return;
  const style = host.ownerDocument.createElement("style");
  style.setAttribute("data-tsunagi-play", "");
  style.textContent = TSUNAGI_PLAY_STYLE;
  target.append(style);
}
