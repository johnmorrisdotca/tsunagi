import { decodeLayout } from "./code.ts";
import { decodeLines } from "./lines.ts";
import { loadTsunagiLevels } from "./levels.ts";
import { mountTsunagi, type TsunagiMount } from "./mount.ts";
import type { TsunagiExplosionChoice, TsunagiGame, TsunagiProgress } from "./game.ts";
import { TSUNAGI_BOARD_NAMES, type TsunagiBoardName } from "./boards.ts";
import { TSUNAGI_COLOUR_SET_NAMES, type TsunagiColourSetName } from "./colours.ts";

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
 *  - `size` and `level`: the level to play, from the package's own levels, fetched when asked. Or `size` and
 *    `givens` (with `answer` if there is one): a layout of your own.
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
const ElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const isOn = (value: string | null): boolean => value !== null && !["false", "off", "0", "no"].includes(value.toLowerCase());
const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined);

export class TsunagiBoard extends ElementBase {
  static observedAttributes = ["size", "level", "givens", "answer", "marks", "fill", "colour-set", "board", "coordinates", "explosions", "cheats", "controls", "chips", "zoom", "lang", "progress"];

  #mount: TsunagiMount | null = null;
  #levelKey = "";
  #asked = 0;
  #queued = false;

  connectedCallback(): void {
    this.#refresh();
  }

  disconnectedCallback(): void {
    this.#mount?.destroy();
    this.#mount = null;
    this.#levelKey = "";
  }

  attributeChangedCallback(): void {
    if (!this.isConnected || this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      void this.#refresh();
    });
  }

  /** The mounted board's handle (`mountTsunagi`), or null until a level has loaded. */
  get mount(): TsunagiMount | null {
    return this.#mount;
  }

  get game(): TsunagiGame | null {
    return this.#mount?.game() ?? null;
  }

  get progress(): TsunagiProgress | null {
    return this.#mount?.progress() ?? null;
  }

  undo(): void {
    this.#mount?.undo();
  }

  restart(): void {
    this.#mount?.restart();
  }

  check(): void {
    this.#mount?.check();
  }

  cheat(): void {
    this.#mount?.cheat();
  }

  fit(): void {
    this.#mount?.fit();
  }

  async #refresh(): Promise<void> {
    const size = Number(this.getAttribute("size"));
    const level = this.getAttribute("level") === null ? undefined : Number(this.getAttribute("level"));
    let givens = this.getAttribute("givens") ?? undefined;
    let answer = this.getAttribute("answer") ?? undefined;
    if (!Number.isInteger(size) || size < 2) return;
    const explosions = oneOf<TsunagiExplosionChoice>(this.getAttribute("explosions"), ["on", "soft", "off"]);
    const cheats = isOn(this.getAttribute("cheats"));
    const key = JSON.stringify([size, level, givens, answer, explosions, cheats, this.getAttribute("controls"), this.getAttribute("chips"), this.getAttribute("zoom")]);
    const look = {
      marks: oneOf(this.getAttribute("marks"), ["colours", "numbers"] as const),
      fill: oneOf(this.getAttribute("fill"), ["marbles", "lines"] as const),
      colours: oneOf<TsunagiColourSetName>(this.getAttribute("colour-set"), TSUNAGI_COLOUR_SET_NAMES),
      board: oneOf<TsunagiBoardName>(this.getAttribute("board"), TSUNAGI_BOARD_NAMES),
      coordinates: isOn(this.getAttribute("coordinates")),
    };
    const language = oneOf(this.getAttribute("lang"), ["en", "ja"] as const);
    if (key === this.#levelKey && this.#mount !== null) {
      this.#mount.set({ ...look, language });
      return;
    }
    const ask = (this.#asked += 1);
    if (givens === undefined && level !== undefined) {
      const rows = await loadTsunagiLevels(size).catch(() => null);
      if (ask !== this.#asked) return;
      const row = rows?.[level - 1];
      if (row === undefined) return;
      [givens, answer] = row;
    }
    if (givens === undefined || ask !== this.#asked) return;
    const layout = decodeLayout(givens, size);
    if (layout === null) return;
    const kept = this.getAttribute("progress");
    const lines = kept === null ? undefined : (decodeLines(layout, kept) ?? undefined);
    this.#mount?.destroy();
    this.#levelKey = key;
    const zoom = oneOf(this.getAttribute("zoom"), ["auto", "on", "off"] as const);
    this.#mount = mountTsunagi(this, {
      size,
      givens,
      answer,
      level,
      lines,
      ...look,
      language,
      explosions,
      cheats: cheats && answer !== undefined,
      controls: isOn(this.getAttribute("controls") ?? "on"),
      chips: isOn(this.getAttribute("chips")),
      zoom,
    });
  }
}
