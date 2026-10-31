import type { TsunagiBoardLook, TsunagiBoardName } from "./boards.ts";
import { create, createTsunagiChrome, type TsunagiChrome } from "./chrome.ts";
import { CELL_BRIDGE } from "./code.ts";
import type { TsunagiColour, TsunagiColourSetName, TsunagiFill, TsunagiMarks } from "./colours.ts";
import { drawTsunagi, drawTsunagiPair } from "./draw.ts";
import {
  cheatGame,
  checkGame,
  helpOf,
  liftGame,
  newTsunagiGame,
  restartGame,
  type TsunagiExplosionChoice,
  type TsunagiGame,
  type TsunagiHelp,
  type TsunagiProgress,
  tsunagiProgress,
  undoGame,
} from "./game.ts";
import { type TsunagiGeometry, tsunagiGeometry } from "./geometry.ts";
import { attachTsunagiKeyboard, type TsunagiKeyboard } from "./keyboard.ts";
import type { TsunagiSet } from "./levelCounts.ts";
import { answerOf, encodeLines, type Lines } from "./lines.ts";
import { TSUNAGI_PLAY_STYLE } from "./playStyle.ts";
import { attachTsunagiPointer, type TsunagiPointer } from "./pointer.ts";
import { type TsunagiLanguage, tsunagiLanguageOf, tsunagiSay } from "./strings.ts";
import { keptView, TSUNAGI_FITTED, TSUNAGI_ZOOM_FROM, type TsunagiView, zoomedAbout } from "./viewport.ts";

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
const FLASH_MS = 2400;
const BLAST_MS = 1200;
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

/** Draw a level into `host` and play it. Returns the handle that drives it, or null for a layout code that is no layout at that size.
 * @param host - The HTMLElement that owns the native interface.
 * @param options - Native settings and callbacks for this mounted interface.
 * @returns The native mounted handle, or null for unsupported settings.
 * @example
 * ```ts
 * import { mountTsunagi } from "@johnmorrisdotca/tsunagi/play";
 * const show = (host: HTMLElement, options: Parameters<typeof mountTsunagi>[1]) => mountTsunagi(host, options);
 * console.log(typeof show); // function
 * ```
 */
export function mountTsunagi(host: HTMLElement, options: TsunagiMountOptions): TsunagiMount | null {
  const document = host.ownerDocument;
  const first = newTsunagiGame(options.givens, options.size, {
    answer: options.answer,
    explosions: options.explosions,
    cheats: options.cheats,
    lines: options.lines,
  });
  if (first === null) return null;
  let game: TsunagiGame = first;
  ensureTsunagiPlayStyle(host);

  let look: TsunagiLook = {
    marks: options.marks,
    fill: options.fill,
    colours: options.colours,
    board: options.board,
    coordinates: options.coordinates,
  };
  let explosions: TsunagiExplosionChoice = options.explosions ?? "on";
  let cheats = options.cheats === true;
  let level = options.level;
  let set: TsunagiSet = options.set ?? "classic";
  let answer = options.answer;
  let givens = options.givens;
  let size = options.size;
  let explicitLanguage = options.language;
  const withControls = options.controls !== false;
  const withChips = options.chips === true;
  let language: TsunagiLanguage =
    explicitLanguage ??
    tsunagiLanguageOf(host.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
  const callbacks = options;

  // The parts.
  host.classList.add("tsunagi-play");
  host.replaceChildren();
  const box = create(document, "div", "tsp-box");
  const inner = create(document, "div", "tsp-inner");
  box.append(inner);

  // What is on show.
  let shownFlags: readonly number[] | null = null;
  let shownBlast: readonly number[] | null = null;
  let flagTimer = 0;
  let blastTimer = 0;
  let view: TsunagiView = TSUNAGI_FITTED;
  let boxWidth = 0;
  let geometry: TsunagiGeometry = tsunagiGeometry(game.layout, { coordinates: look.coordinates });
  let solvedTold = false;
  let drawnKey = "";
  let drawnLines: Lines | null = null;
  let drawnStill = "";

  const zooming = (): boolean => options.zoom === "on" || (options.zoom !== "off" && size >= TSUNAGI_ZOOM_FROM);
  const detail = (extra: Partial<TsunagiEventDetail> = {}): TsunagiEventDetail => ({
    lines: game.lines,
    code: encodeLines(game.layout, game.lines),
    progress: tsunagiProgress(game),
    answer: answerOf(game.layout, game.lines),
    helped: helpOf(game),
    ...extra,
  });
  const tell = (name: string, info: TsunagiEventDetail, callback?: (detail: TsunagiEventDetail) => void): void => {
    callback?.(info);
    host.dispatchEvent(
      new CustomEvent(name, { detail: JSON.parse(JSON.stringify(info)), bubbles: true, composed: true }),
    );
  };
  const say = (key: string, values: Record<string, string | number> = {}): string => tsunagiSay(language, key, values);

  // The buttons call the handle, which is built below; nothing is drawn until both exist.
  let chrome!: TsunagiChrome;
  let keys!: TsunagiKeyboard;
  let pointing!: TsunagiPointer;

  /**
   * Only the pairs whose line changed are redrawn, in the drawing already there: on a board of dozens of
   * lines the whole drawing is thousands of elements, and a finger moving through a cell changes one or two
   * pairs'. Where the drawing has to be made whole (a look changed, a flash, a solve, a bridge) it is.
   */
  function patch(g: TsunagiGame, previous: Lines): boolean {
    const svg = inner.querySelector("svg");
    const paper = svg?.querySelector('linearGradient[id$="-paper"]');
    if (svg === null || svg === undefined || paper === null || paper === undefined) return false;
    const id = paper.id.slice(0, -"-paper".length);
    const options = { ...look, lines: g.lines, language };
    for (const [pair, line] of g.lines.entries()) {
      if (line === previous[pair]) continue;
      const parts = drawTsunagiPair(g.layout, pair, id, options);
      const washes = svg.querySelector(`.tsu-washes > [data-pair="${pair}"]`);
      const beads = svg.querySelector(`.tsu-beads > [data-pair="${pair}"]`);
      const drawn = svg.querySelector(".tsu-lines");
      if (washes === null || beads === null || drawn === null) return false;
      washes.innerHTML = parts.washes;
      beads.innerHTML = parts.beads;
      const ghosts = svg.querySelector(`.tsu-ghosts > [data-pair="${pair}"]`);
      if (ghosts !== null) ghosts.innerHTML = parts.ghosts;
      drawn.querySelector(`:scope > .tsu-line[data-pair="${pair}"]`)?.remove();
      if (parts.line !== "") drawn.insertAdjacentHTML("beforeend", parts.line);
    }
    return true;
  }

  function render(force = false): void {
    const g = game;
    const over = g.solved || tsunagiProgress(g).outOfStrokes;
    const still = JSON.stringify([
      shownFlags,
      shownBlast,
      g.solved,
      look.marks,
      look.fill,
      look.board,
      look.colours,
      look.coordinates,
      language,
      g.layout.size,
    ]);
    const key = JSON.stringify([g.lines, still]);
    if (force || key !== drawnKey) {
      drawnKey = key;
      const patched =
        !force &&
        drawnLines !== null &&
        still === drawnStill &&
        !g.layout.cells.includes(CELL_BRIDGE) &&
        patch(g, drawnLines);
      if (!patched)
        inner.innerHTML = drawTsunagi(g.layout, {
          ...look,
          lines: g.lines,
          flagged: shownFlags ?? [],
          blasted: shownBlast ?? [],
          done: g.solved,
          language,
        });
      drawnLines = g.lines;
      drawnStill = still;
    }
    box.dataset.over = String(over);
    chrome.words();
    keys.paint();
  }

  /** Bring the game's flags and bursts onto the board for a moment. */
  function showTransient(): void {
    window.clearTimeout(flagTimer);
    window.clearTimeout(blastTimer);
    shownFlags = game.flagged;
    shownBlast = game.blasted;
    if (shownFlags !== null)
      flagTimer = window.setTimeout(() => {
        shownFlags = null;
        render();
      }, FLASH_MS);
    if (shownBlast !== null)
      blastTimer = window.setTimeout(() => {
        shownBlast = null;
        render();
      }, BLAST_MS);
  }

  function after(before: TsunagiGame): void {
    if (game === before) return;
    const changed = game.lines !== before.lines;
    showTransient();
    render();
    if (changed) tell("tsunagi-change", detail(), callbacks.onChange);
  }

  function finishStroke(): void {
    const before = game;
    game = liftGame(before);
    const stroked = game.strokes !== before.strokes;
    after(before);
    if (!stroked) return;
    tell("tsunagi-stroke", detail(), callbacks.onStroke);
    if (game.exploded !== null)
      tell(
        "tsunagi-explosion",
        detail({ explosion: { kind: game.exploded, cells: game.blasted ?? [] } }),
        callbacks.onExplosion,
      );
    if (game.solved && !solvedTold) {
      solvedTold = true;
      tell("tsunagi-solve", detail(), callbacks.onSolve);
    }
  }
  const onWheel = (event: WheelEvent): void => {
    if (!zooming()) return;
    event.preventDefault();
    const rect = box.getBoundingClientRect();
    const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002));
    view = zoomedAbout(view, factor, event.clientX - rect.left, event.clientY - rect.top, rect.width);
    chrome.applyView();
  };
  box.addEventListener("wheel", onWheel, { passive: false });
  const resize =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          const width = box.getBoundingClientRect().width;
          if (width === boxWidth) return;
          boxWidth = width;
          view = keptView(view, boxWidth);
          chrome.applyView();
        });
  const watching =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(() => {
          if (explicitLanguage !== undefined) return;
          const next = tsunagiLanguageOf(host.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
          if (next === language) return;
          language = next;
          chrome.renderChips();
          render(true);
        });
  function begin(next: TsunagiGame): void {
    window.clearTimeout(flagTimer);
    window.clearTimeout(blastTimer);
    game = next;
    keys.reset(next.layout.ends[0]?.[0] ?? 0);
    shownFlags = null;
    shownBlast = null;
    solvedTold = next.solved;
    chrome.closeChip();
    view = TSUNAGI_FITTED;
    geometry = tsunagiGeometry(next.layout, { coordinates: look.coordinates });
    chrome.reserve(next);
    chrome.renderChips();
    chrome.applyView();
    render(true);
  }

  const api: TsunagiMount = {
    host,
    game: () => game,
    progress: () => tsunagiProgress(game),
    load: (next) => {
      const made = newTsunagiGame(next.givens, next.size, {
        answer: next.answer,
        explosions,
        cheats,
        lines: next.lines,
      });
      if (made === null) return;
      givens = next.givens;
      size = next.size;
      answer = next.answer;
      level = next.level;
      set = next.set ?? "classic";
      begin(made);
      tell("tsunagi-change", detail(), callbacks.onChange);
    },
    set: (changes) => {
      const { explosions: nextExplosions, cheats: nextCheats, language: nextLanguage, ...nextLook } = changes;
      look = { ...look, ...nextLook };
      if (nextExplosions !== undefined) explosions = nextExplosions;
      if (nextCheats !== undefined) cheats = nextCheats;
      if (nextLanguage !== undefined) {
        explicitLanguage = nextLanguage;
        language = nextLanguage;
      }
      geometry = tsunagiGeometry(game.layout, { coordinates: look.coordinates });
      // Help changes what is played, so it starts the level again; a look only redraws.
      if (nextExplosions !== undefined || nextCheats !== undefined) {
        const made = newTsunagiGame(givens, size, { answer, explosions, cheats });
        if (made !== null) begin(made);
        return;
      }
      chrome.renderChips();
      render(true);
    },
    undo: () => {
      const before = game;
      game = undoGame(before);
      after(before);
    },
    restart: () => {
      const before = game;
      game = restartGame(before);
      if (game !== before) solvedTold = false;
      after(before);
    },
    check: () => {
      const before = game;
      game = checkGame(before);
      after(before);
    },
    cheat: () => {
      const before = game;
      game = cheatGame(before);
      after(before);
      if (game !== before && game.solved && !solvedTold) {
        solvedTold = true;
        tell("tsunagi-solve", detail(), callbacks.onSolve);
      }
    },
    fit: () => {
      view = TSUNAGI_FITTED;
      chrome.applyView();
    },
    destroy: () => {
      window.clearTimeout(flagTimer);
      window.clearTimeout(blastTimer);
      pointing.stop();
      keys.stop();
      box.removeEventListener("wheel", onWheel);
      resize?.disconnect();
      watching?.disconnect();
      host.replaceChildren();
      host.classList.remove("tsunagi-play");
      delete host.dataset.solved;
      delete host.dataset.strokes;
      delete host.dataset.joined;
      delete host.dataset.filled;
    },
  };

  chrome = createTsunagiChrome({
    host,
    document,
    box,
    inner,
    withControls,
    withChips,
    game: () => game,
    view: () => view,
    setView: (next) => {
      view = next;
    },
    boxWidth: () => boxWidth,
    zooming,
    say,
    language: () => language,
    size: () => size,
    level: () => level,
    set: () => set,
    givens: () => givens,
    shownBlast: () => shownBlast,
    undo: () => api.undo(),
    restart: () => api.restart(),
    check: () => api.check(),
    cheat: () => api.cheat(),
    fit: () => api.fit(),
  });
  pointing = attachTsunagiPointer({
    box,
    inner,
    game: () => game,
    setGame: (next) => {
      game = next;
    },
    geometry: () => geometry,
    view: () => view,
    setView: (next) => {
      view = next;
    },
    applyView: () => chrome.applyView(),
    after,
    finishStroke,
  });
  keys = attachTsunagiKeyboard({
    host,
    box,
    inner,
    document,
    game: () => game,
    setGame: (next) => {
      game = next;
    },
    size: () => size,
    say,
    geometry: () => geometry,
    view: () => view,
    setView: (next) => {
      view = next;
    },
    applyView: () => chrome.applyView(),
    drawing: () => pointing.drawing(),
    finishStroke,
    undo: () => api.undo(),
    after,
  });

  resize?.observe(box);
  watching?.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  begin(game);
  boxWidth = box.getBoundingClientRect().width;
  chrome.applyView();
  return api;
}
