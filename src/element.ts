import { embedDay, dailySeed } from "./embed-day.ts";
import { dailyTsunagiLevel } from "./daily.ts";
import { TSUNAGI_PORTAL_COUNTS, TSUNAGI_LEVEL_COUNTS } from "./levelCounts.ts";
import { TSUNAGI_PLAY_STYLE } from "./playStyle.ts";
import type { TsunagiBoardLook } from "./boards.ts";
import type { TsunagiColour } from "./colours.ts";
import { decodeLayout } from "./code.ts";
import { decodeLines } from "./lines.ts";
import { loadTsunagiLevels } from "./levels.ts";
import type { TsunagiSet } from "./levelCounts.ts";
import { mountTsunagi, type TsunagiMount, type TsunagiMountOptions } from "./mount.ts";
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
const ElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const isOn = (value: string | null): boolean => value !== null && !["false", "off", "0", "no"].includes(value.trim().toLowerCase());
const offAlias = (value: string | null): string | null => value !== null && ["false", "no", "0"].includes(value.trim().toLowerCase()) ? "off" : value;
const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined);

/** Every mounted-board option, kept complete by TypeScript and checked by the builder. */
export const TSUNAGI_EMBED_OPTION_KEYS = Object.keys({ size: true, givens: true, answer: true, level: true, set: true, lines: true, explosions: true, cheats: true, controls: true, chips: true, zoom: true, language: true, marks: true, fill: true, colours: true, board: true, coordinates: true, onChange: true, onStroke: true, onExplosion: true, onSolve: true } satisfies Record<keyof TsunagiMountOptions, boolean>);
/** Host callbacks and custom drawing palettes, which cannot be put in an attribute. */
export type TsunagiElementOptions = Pick<TsunagiMountOptions, "onChange" | "onStroke" | "onExplosion" | "onSolve"> & { colours?: readonly TsunagiColour[]; board?: TsunagiBoardLook };

export class TsunagiBoard extends ElementBase {
  static observedAttributes = ["size", "level", "set", "givens", "answer", "marks", "fill", "colour-set", "board", "coordinates", "explosions", "cheats", "controls", "chips", "zoom", "lang", "progress", "grid", "daily", "theme", "width", "label"];

  #widthBefore: string | null = null;
  #widthOwned = false;
  #labelBefore: { role: string | null; label: string | null } | null = null;
  #write(name: string, value: unknown): void {
    if (value === null || value === undefined) this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }
  #frame(): void {
    this.setAttribute("data-tsunagi-embed", "");
    const width = Number(this.getAttribute("width"));
    const size = this.getAttribute("size");
    const displaySize = size === null && (this.hasAttribute("grid") || this.hasAttribute("daily")) ? "medium" : size;
    const owned = (this.hasAttribute("width") && Number.isFinite(width) && width > 0) || (displaySize !== null && ["small", "medium", "large"].includes(displaySize));
    if (owned && !this.#widthOwned) { this.#widthBefore = this.style.width; this.#widthOwned = true; }
    if (this.hasAttribute("width") && Number.isFinite(width) && width > 0) this.style.width = `${Math.min(width, 2000)}px`;
    else if (displaySize !== null && ["small", "medium", "large"].includes(displaySize)) this.style.width = `${{ small: 320, medium: 480, large: 640 }[displaySize as "small" | "medium" | "large"]}px`;
    else if (this.#widthOwned) { this.style.width = this.#widthBefore ?? ""; this.#widthOwned = false; }
    this.style.maxWidth = "100%";
    const theme = this.getAttribute("theme"); this.style.colorScheme = theme === "light" || theme === "dark" ? theme : "light dark";
    const root = this.getRootNode();
    const target: ParentNode = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : this.ownerDocument.head;
    if (target.querySelector("style[data-tsunagi-embed-style]") === null) {
      const style = this.ownerDocument.createElement("style"); style.setAttribute("data-tsunagi-embed-style", "");
      const rules = (theme: string) => [...TSUNAGI_PLAY_STYLE.matchAll(new RegExp(`:root\\[data-theme="${theme}"\\] ([^{]+)\\{([^}]+)\\}`, "g"))].map(match => `[data-tsunagi-embed][theme="${theme}"]${match[1].trim() === ".tsunagi-play" ? ".tsunagi-play" : ` ${match[1].trim()}`} {${match[2]}}`).join("\n");
      const light = [...TSUNAGI_PLAY_STYLE.matchAll(/\.(tsunagi|tsunagi-play) \{([^}]+)\}/g)].filter(match => !match[2].includes("#ece8dc") && !match[2].includes("#171a18"));
      style.textContent = `@media(prefers-color-scheme:dark){${rules("dark").replaceAll('[theme="dark"]', ':not([theme="light"]):not([theme="dark"])')}}\n${rules("dark")}\n${light.map(match => `[data-tsunagi-embed][theme="light"]${match[1] === "tsunagi-play" ? ".tsunagi-play" : " .tsunagi"} {${match[2]}}`).join("\n")}\n[data-tsunagi-embed][label]{outline-offset:2px}`;
      target.append(style);
    }
    if (this.hasAttribute("label")) { this.#labelBefore ??= { role: this.getAttribute("role"), label: this.getAttribute("aria-label") }; this.setAttribute("role", "group"); this.setAttribute("aria-label", this.getAttribute("label")!); }
    else if (this.#labelBefore !== null) { for (const [name, value] of [["role", this.#labelBefore.role], ["aria-label", this.#labelBefore.label]]) { if (value === null) this.removeAttribute(name!); else this.setAttribute(name!, value); } this.#labelBefore = null; }
  }

  #options: TsunagiElementOptions = {};
  /** Host callbacks and palettes; new callbacks do not restart the current game. */
  get options(): TsunagiElementOptions { return this.#options; }
  set options(value: TsunagiElementOptions) { this.#options = value ?? {}; if (this.isConnected) void this.#refresh(); }
  #problem(message: string): void {
    this.#mount?.destroy(); this.#mount = null; this.#levelKey = "";
    const status = this.ownerDocument.createElement("p"); status.setAttribute("role", "status"); status.textContent = message; this.replaceChildren(status);
    this.dispatchEvent(new CustomEvent("tsunagi-error", { bubbles: true, composed: true, detail: { message } }));
  }

  /** The `size` attribute, reflected. */
  get size(): string | null { return this.getAttribute("size"); }
  set size(value: string | number | boolean | null | undefined) { this.#write("size", value); }
  /** The `level` attribute, reflected. */
  get level(): string | null { return this.getAttribute("level"); }
  set level(value: string | number | boolean | null | undefined) { this.#write("level", value); }
  /** The `set` attribute, reflected. */
  get set(): string | null { return this.getAttribute("set"); }
  set set(value: string | number | boolean | null | undefined) { this.#write("set", value); }
  /** The `givens` attribute, reflected. */
  get givens(): string | null { return this.getAttribute("givens"); }
  set givens(value: string | number | boolean | null | undefined) { this.#write("givens", value); }
  /** The `answer` attribute, reflected. */
  get answer(): string | null { return this.getAttribute("answer"); }
  set answer(value: string | number | boolean | null | undefined) { this.#write("answer", value); }
  /** The `marks` attribute, reflected. */
  get marks(): string | null { return this.getAttribute("marks"); }
  set marks(value: string | number | boolean | null | undefined) { this.#write("marks", value); }
  /** The `fill` attribute, reflected. */
  get fill(): string | null { return this.getAttribute("fill"); }
  set fill(value: string | number | boolean | null | undefined) { this.#write("fill", value); }
  /** The `colour-set` attribute, reflected. */
  get "colour-set"(): string | null { return this.getAttribute("colour-set"); }
  set "colour-set"(value: string | number | boolean | null | undefined) { this.#write("colour-set", value); }
  /** The `colour-set` attribute, reflected. */
  get colourSet(): string | null { return this.getAttribute("colour-set"); }
  set colourSet(value: string | number | boolean | null | undefined) { this.#write("colour-set", value); }
  /** The `board` attribute, reflected. */
  get board(): string | null { return this.getAttribute("board"); }
  set board(value: string | number | boolean | null | undefined) { this.#write("board", value); }
  /** The `coordinates` attribute, reflected. */
  get coordinates(): string | null { return this.getAttribute("coordinates"); }
  set coordinates(value: string | number | boolean | null | undefined) { this.#write("coordinates", value); }
  /** The `explosions` attribute, reflected. */
  get explosions(): string | null { return this.getAttribute("explosions"); }
  set explosions(value: string | number | boolean | null | undefined) { this.#write("explosions", value); }
  /** The `cheats` attribute, reflected. */
  get cheats(): string | null { return this.getAttribute("cheats"); }
  set cheats(value: string | number | boolean | null | undefined) { this.#write("cheats", value); }
  /** The `controls` attribute, reflected. */
  get controls(): string | null { return this.getAttribute("controls"); }
  set controls(value: string | number | boolean | null | undefined) { this.#write("controls", value); }
  /** The `chips` attribute, reflected. */
  get chips(): string | null { return this.getAttribute("chips"); }
  set chips(value: string | number | boolean | null | undefined) { this.#write("chips", value); }
  /** The `zoom` attribute, reflected. */
  get zoom(): string | null { return this.getAttribute("zoom"); }
  set zoom(value: string | number | boolean | null | undefined) { this.#write("zoom", value); }
  /** The `grid` attribute, reflected. */
  get grid(): string | null { return this.getAttribute("grid"); }
  set grid(value: string | number | boolean | null | undefined) { this.#write("grid", value); }
  /** The `daily` attribute, reflected. */
  get daily(): string | null { return this.getAttribute("daily"); }
  set daily(value: string | number | boolean | null | undefined) { this.#write("daily", value); }
  /** The `theme` attribute, reflected. */
  get theme(): string | null { return this.getAttribute("theme"); }
  set theme(value: string | number | boolean | null | undefined) { this.#write("theme", value); }
  /** The `width` attribute, reflected. */
  get width(): string | null { return this.getAttribute("width"); }
  set width(value: string | number | boolean | null | undefined) { this.#write("width", value); }
  /** The `label` attribute, reflected. */
  get label(): string | null { return this.getAttribute("label"); }
  set label(value: string | number | boolean | null | undefined) { this.#write("label", value); }

  #mount: TsunagiMount | null = null;
  #levelKey = "";
  #asked = 0;
  #queued = false;

  connectedCallback(): void {
    this.#refresh();
  }

  disconnectedCallback(): void {
    this.#asked += 1;
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

  /** A kept lines code to restore; the getter still reads live progress. */
  set progress(value: string | null | undefined) { this.#write("progress", value); }

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
    if (!this.isConnected) return;
    this.#frame();
    const display = this.getAttribute("size");
    const size = Number(this.getAttribute("grid") ?? (display !== null && !["small", "medium", "large"].includes(display) ? display : "7"));
    let level = this.getAttribute("level") === null ? undefined : Number(this.getAttribute("level"));
    const set: TsunagiSet = this.getAttribute("set") === "portals" ? "portals" : "classic";
    let givens = this.getAttribute("givens") ?? undefined;
    let answer = this.getAttribute("answer") ?? undefined;
    let day: string | null;
    try { day = givens === undefined ? embedDay(this.getAttribute("daily")) : null; } catch { this.#problem("Use a real UTC date written YYYY-MM-DD."); return; }
    if (day === null) this.removeAttribute("data-day"); else this.setAttribute("data-day", day);
    if (day !== null) level = set === "portals" ? TSUNAGI_PORTAL_COUNTS[size] === undefined ? undefined : dailySeed(day, `tsunagi/portals/${size}`) % TSUNAGI_PORTAL_COUNTS[size] + 1 : dailyTsunagiLevel(size, day) ?? undefined;
    if (!Number.isInteger(size) || size < 2 || (givens === undefined && (set === "portals" ? TSUNAGI_PORTAL_COUNTS[size] : TSUNAGI_LEVEL_COUNTS[size]) === undefined)) { this.#problem("Choose a valid grid and level in this set."); return; }
    const explosions = oneOf<TsunagiExplosionChoice>(offAlias(this.getAttribute("explosions")), ["on", "soft", "off"]);
    const cheats = isOn(this.getAttribute("cheats"));
    const key = JSON.stringify([size, level, set, day, this.getAttribute("progress"), givens, answer, explosions, cheats, this.getAttribute("controls"), this.getAttribute("chips"), this.getAttribute("zoom")]);
    const look = {
      marks: oneOf(this.getAttribute("marks"), ["colours", "numbers"] as const),
      fill: oneOf(this.getAttribute("fill"), ["marbles", "lines"] as const),
      colours: this.#options.colours ?? oneOf<TsunagiColourSetName>(this.getAttribute("colour-set"), TSUNAGI_COLOUR_SET_NAMES),
      board: this.#options.board ?? oneOf<TsunagiBoardName>(this.getAttribute("board"), TSUNAGI_BOARD_NAMES),
      coordinates: isOn(this.getAttribute("coordinates")),
    };
    const language = oneOf(this.getAttribute("lang"), ["en", "ja"] as const);
    if (key === this.#levelKey && this.#mount !== null) {
      this.#mount.set({ ...look, language });
      return;
    }
    const ask = (this.#asked += 1);
    if (givens === undefined && level !== undefined) {
      const rows = await loadTsunagiLevels(size, set).catch(() => null);
      if (!this.isConnected || ask !== this.#asked) return;
      const row = rows?.[level - 1];
      if (row === undefined) { this.#problem("Choose a valid grid and level in this set."); return; }
      [givens, answer] = row;
    }
    if (givens === undefined || !this.isConnected || ask !== this.#asked) return;
    const layout = decodeLayout(givens, size);
    if (layout === null) return;
    const kept = this.getAttribute("progress");
    const lines = kept === null ? undefined : (decodeLines(layout, kept) ?? undefined);
    this.#mount?.destroy();
    this.#levelKey = key;
    const zoom = oneOf(offAlias(this.getAttribute("zoom")), ["auto", "on", "off"] as const);
    this.#mount = mountTsunagi(this, {
      size,
      givens,
      answer,
      level,
      set,
      lines,
      ...look,
      language,
      explosions,
      cheats: cheats && answer !== undefined,
      controls: isOn(this.getAttribute("controls") ?? "on"),
      chips: isOn(this.getAttribute("chips")),
      zoom,
      onChange: (detail) => this.#options.onChange?.(detail),
      onStroke: (detail) => this.#options.onStroke?.(detail),
      onExplosion: (detail) => this.#options.onExplosion?.(detail),
      onSolve: (detail) => this.#options.onSolve?.(detail),
    });
    this.#frame();
    this.dispatchEvent(new CustomEvent("tsunagi-load", { bubbles: true, composed: true, detail: { grid: size, set, level: level ?? null, day } }));
  }
}

/** Register a standard or custom board tag, preserving a definition. Safe without a browser. */
export function defineBoard(tag = "tsunagi-board"): void {
  if (typeof customElements === "undefined" || customElements.get(tag) !== undefined) return;
  customElements.define(tag, tag === "tsunagi-board" ? TsunagiBoard : class extends TsunagiBoard {});
}
