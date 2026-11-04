import { create, createTsunagiChrome, type TsunagiChrome } from "./chrome.ts";
import { CELL_BRIDGE } from "./code.ts";
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
  tsunagiProgress,
  undoGame,
} from "./game.ts";
import { type TsunagiGeometry, tsunagiGeometry } from "./geometry.ts";
import { attachTsunagiKeyboard, type TsunagiKeyboard } from "./keyboard.ts";
import type { TsunagiSet } from "./levelCounts.ts";
import { answerOf, encodeLines, type Lines } from "./lines.ts";
import type { TsunagiEventDetail, TsunagiLook, TsunagiMount, TsunagiMountOptions } from "./mount-types.ts";
import { BLAST_MS, ensureTsunagiPlayStyle, FLASH_MS } from "./mount-types.ts";
import { attachTsunagiPointer, type TsunagiPointer } from "./pointer.ts";
import { type TsunagiLanguage, tsunagiLanguageOf, tsunagiSay } from "./strings.ts";
import {
  keptView,
  TSUNAGI_FITTED,
  TSUNAGI_MOST_ZOOM,
  TSUNAGI_ZOOM_FROM,
  type TsunagiView,
  zoomedAbout,
} from "./viewport.ts";

export type { TsunagiEventDetail, TsunagiLook, TsunagiMount, TsunagiMountOptions } from "./mount-types.ts";
export { ensureTsunagiPlayStyle } from "./mount-types.ts";

/** Wheel steps closer together than this, in milliseconds, belong to one turn of the wheel, so a zoom that reaches its end part-way through does not hand the rest to the page. */
const WHEEL_GESTURE_MS = 300;

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
    // A square box for every whole board; a board with a shape is as big as it is, so nothing of it is cut off.
    const shape = geometry.width === geometry.height ? "" : `${geometry.width} / ${geometry.height}`;
    if (box.style.aspectRatio !== shape) box.style.aspectRatio = shape;
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
  let wheelTaken = Number.NEGATIVE_INFINITY;
  const onWheel = (event: WheelEvent): void => {
    if (!zooming()) return;
    const pinch = event.ctrlKey || event.metaKey;
    if (!pinch && (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))) return;
    const lines = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 800 : 1;
    const factor = Math.exp(-event.deltaY * lines * (pinch ? 0.01 : 0.002));
    // A wheel that starts with the zoom already at its end is left to the page, so the page is never trapped.
    const atEnd = factor >= 1 ? view.zoom >= TSUNAGI_MOST_ZOOM : view.zoom <= 1;
    const now = Number.isFinite(event.timeStamp) ? event.timeStamp : 0;
    if (!pinch && atEnd && !(now >= wheelTaken && now - wheelTaken < WHEEL_GESTURE_MS)) return;
    event.preventDefault();
    wheelTaken = now;
    const rect = box.getBoundingClientRect();
    view = zoomedAbout(view, factor, event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    chrome.applyView();
  };
  box.addEventListener("wheel", onWheel, { passive: false });
  const resize =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          const { width, height } = box.getBoundingClientRect();
          if (width === boxWidth) return;
          boxWidth = width;
          view = keptView(view, boxWidth, height);
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
    boxHeight: () => box.getBoundingClientRect().height,
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
