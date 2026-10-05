import type { TsunagiBoardLook, TsunagiBoardName } from "./boards.ts";
import type { TsunagiColour, TsunagiColourSetName, TsunagiFill, TsunagiMarks } from "./colours.ts";
import { CELL_BRIDGE } from "./code.ts";
import type { TsunagiSet } from "./levelCounts.ts";
import { answerOf, encodeLines, type Lines } from "./lines.ts";
import { drawTsunagi, drawTsunagiPair } from "./draw.ts";
import { cellAtPoint, tsunagiGeometry, type TsunagiGeometry } from "./geometry.ts";
import {
  cheatGame,
  checkGame,
  dragGame,
  helpOf,
  liftGame,
  newTsunagiGame,
  pressGame,
  restartGame,
  tsunagiProgress,
  undoGame,
  type TsunagiExplosionChoice,
  type TsunagiGame,
  type TsunagiHelp,
  type TsunagiProgress,
} from "./game.ts";
import { challengesOf, tsunagiMarks, tsunagiRole } from "./ladder.ts";
import type { Challenge } from "./ladder.types.ts";
import { TSUNAGI_PLAY_STYLE } from "./playStyle.ts";
import { tsunagiLanguageOf, tsunagiSay, type TsunagiLanguage } from "./strings.ts";
import { edgeNudge, keptView, TSUNAGI_FITTED, TSUNAGI_ZOOM_FROM, zoomedAbout, type TsunagiView } from "./viewport.ts";

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

/** What a board looks like: every option `drawTsunagi` takes that does not depend on the lines. */
export type TsunagiLook = {
  marks?: TsunagiMarks;
  fill?: TsunagiFill;
  colours?: TsunagiColourSetName | readonly TsunagiColour[];
  board?: TsunagiBoardName | TsunagiBoardLook;
  coordinates?: boolean;
};

/** What a mounted board tells of itself in every event. */
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

export type TsunagiMount = {
  readonly host: HTMLElement;
  /** The game as it stands. */
  game: () => TsunagiGame;
  progress: () => TsunagiProgress;
  /** Play another level (or the same one again, fresh). `lines` carries on a kept game. */
  load: (level: { size: number; givens: string; answer?: string; level?: number; set?: TsunagiSet; lines?: Lines }) => void;
  /** Change how the board looks, or how it is played: marks, fill, colours, board, coordinates, explosions, cheats, language. A look takes effect at once; explosions and cheats from the next `load` or `restart`. */
  set: (changes: TsunagiLook & { explosions?: TsunagiExplosionChoice; cheats?: boolean; language?: TsunagiLanguage }) => void;
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
/** How long a tapped portal shows its link to the other ring. */
const LINK_MS = 1800;

const CHALLENGE_KEYS: readonly Challenge[] = ["bridges", "walls", "waypoints", "wrap", "portals", "explosions", "strokes", "hexagon", "sparse"];

/** Put the style in the page once: in the document's head, or in the shadow root the host is in. */
export function ensureTsunagiPlayStyle(host: Element): void {
  const root = host.getRootNode();
  const target: ParentNode = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector("style[data-tsunagi-play]") !== null) return;
  const style = host.ownerDocument.createElement("style");
  style.setAttribute("data-tsunagi-play", "");
  style.textContent = TSUNAGI_PLAY_STYLE;
  target.append(style);
}

function create<K extends keyof HTMLElementTagNameMap>(document: Document, tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Draw a level into `host` and play it. Returns the handle that drives it, or null for a layout code that is no layout at that size. */
export function mountTsunagi(host: HTMLElement, options: TsunagiMountOptions): TsunagiMount | null {
  const document = host.ownerDocument;
  const first = newTsunagiGame(options.givens, options.size, { answer: options.answer, explosions: options.explosions, cheats: options.cheats, lines: options.lines });
  if (first === null) return null;
  let game: TsunagiGame = first;
  ensureTsunagiPlayStyle(host);

  let look: TsunagiLook = { marks: options.marks, fill: options.fill, colours: options.colours, board: options.board, coordinates: options.coordinates };
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
  let language: TsunagiLanguage = explicitLanguage ?? tsunagiLanguageOf(host.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
  const callbacks = options;

  // The parts.
  host.classList.add("tsunagi-play");
  host.replaceChildren();
  const box = create(document, "div", "tsp-box");
  const inner = create(document, "div", "tsp-inner");
  box.append(inner);
  const pad = create(document, "div", "tsp-pad");
  pad.setAttribute("role", "group");
  const chips = create(document, "div", "tsp-chips");
  const says = create(document, "p", "tsp-says");
  says.setAttribute("aria-live", "polite");
  const controls = create(document, "div", "tsp-controls");
  const progress = create(document, "p", "tsp-progress");
  progress.setAttribute("aria-live", "polite");
  const messages = create(document, "div", "tsp-messages");
  messages.setAttribute("aria-live", "polite");
  const hint = create(document, "p", "tsp-hint");
  host.append(box, pad, chips, says);
  if (withControls) host.append(controls, progress, messages, hint);

  const button = (name: string, onPress: () => void, parent: HTMLElement, className = "tsp-button"): HTMLButtonElement => {
    const one = create(document, "button", className);
    one.type = "button";
    one.dataset.action = name;
    one.addEventListener("click", onPress);
    parent.append(one);
    return one;
  };
  const undoButton = button("undo", () => api.undo(), controls);
  const restartButton = button("restart", () => api.restart(), controls);
  const checkButton = button("check", () => api.check(), controls);
  const cheatButton = button("cheat", () => api.cheat(), controls);
  const padButtons: Record<string, HTMLButtonElement> = {};
  const padMoves: Record<string, (view: TsunagiView, width: number) => TsunagiView> = {
    out: (view, width) => zoomedAbout(view, 1 / 1.5, width / 2, width / 2, width),
    in: (view, width) => zoomedAbout(view, 1.5, width / 2, width / 2, width),
    left: (view, width) => ({ ...view, x: view.x + Math.round(width / 4) }),
    up: (view, width) => ({ ...view, y: view.y + Math.round(width / 4) }),
    down: (view, width) => ({ ...view, y: view.y - Math.round(width / 4) }),
    right: (view, width) => ({ ...view, x: view.x - Math.round(width / 4) }),
  };
  for (const [name, glyph] of [["out", "−"], ["in", "+"], ["left", "←"], ["up", "↑"], ["down", "↓"], ["right", "→"]] as const) {
    const one = button(name, () => changeView(padMoves[name]!), pad);
    one.textContent = glyph;
    padButtons[name] = one;
  }
  const fitButton = button("fit", () => api.fit(), pad);

  // What is on show.
  let shownFlags: readonly number[] | null = null;
  let shownBlast: readonly number[] | null = null;
  let flagTimer = 0;
  let blastTimer = 0;
  let linkTimer = 0;
  let view: TsunagiView = TSUNAGI_FITTED;
  let boxWidth = 0;
  let geometry: TsunagiGeometry = tsunagiGeometry(game.layout, { coordinates: look.coordinates });
  let solvedTold = false;
  let openChip: string | null = null;
  let drawnKey = "";
  let drawnLines: Lines | null = null;
  let drawnStill = "";
  let pointer: { id: number; cell: number | null; x: number; y: number } | null = null;
  let frame = 0;

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
    host.dispatchEvent(new CustomEvent(name, { detail: info, bubbles: true }));
  };
  const say = (key: string, values: Record<string, string | number> = {}): string => tsunagiSay(language, key, values);

  function applyView(): void {
    const on = zooming();
    pad.hidden = !on;
    if (!on) view = TSUNAGI_FITTED;
    inner.style.width = on && boxWidth > 0 ? `${boxWidth * view.zoom}px` : "100%";
    inner.style.transform = on && view.zoom !== 1 ? `translate(${view.x}px, ${view.y}px)` : "";
    box.dataset.zoom = view.zoom.toFixed(2);
    fitButton.disabled = view.zoom === 1;
    padButtons.out!.disabled = view.zoom === 1;
    padButtons.in!.disabled = view.zoom >= 3;
  }
  function changeView(next: (view: TsunagiView, width: number) => TsunagiView): void {
    view = keptView(next(view, boxWidth), boxWidth);
    applyView();
  }

  function renderChips(): void {
    chips.replaceChildren();
    chips.hidden = !withChips;
    says.hidden = !withChips;
    if (!withChips) return;
    const keys: { key: string; label: string; strong: boolean; says: string }[] = [];
    const marks = level === undefined ? null : tsunagiMarks(size, level, set);
    if (marks !== null) keys.push({ key: "difficulty", label: "", strong: false, says: say("difficultySays") });
    const role = level === undefined ? null : tsunagiRole(size, level, set);
    if (role?.role === "teaches" && role.newOnes.length > 0) keys.push({ key: "teaches", label: say("teaches", { what: role.newOnes.map((each) => say(each)).join(language === "ja" ? "、" : " and ") }), strong: true, says: say("teachesSays") });
    if (role?.role === "tests") keys.push({ key: "tests", label: say("tests"), strong: true, says: say("testsSays") });
    for (const challenge of challengesOf(givens)) if (CHALLENGE_KEYS.includes(challenge)) keys.push({ key: challenge, label: say(challenge), strong: false, says: say(`${challenge}Says`) });
    for (const chip of keys) {
      const one = create(document, "button", "tsp-chip");
      one.type = "button";
      one.dataset.chip = chip.key;
      one.dataset.strong = String(chip.strong);
      one.setAttribute("aria-expanded", String(openChip === chip.key));
      if (chip.key === "difficulty") {
        one.append(say("difficulty"), " ");
        const dots = create(document, "span", "tsp-dots");
        dots.dataset.marks = String(marks);
        dots.setAttribute("aria-label", say("difficultyOf", { n: marks ?? 0 }));
        dots.append("●".repeat(marks ?? 0));
        const off = create(document, "span", "tsp-off", "●".repeat(5 - (marks ?? 0)));
        dots.append(off);
        one.append(dots);
      } else one.textContent = chip.label;
      one.title = chip.says;
      one.addEventListener("click", () => {
        openChip = openChip === chip.key ? null : chip.key;
        renderChips();
      });
      chips.append(one);
    }
    says.textContent = openChip === null ? "" : (keys.find((chip) => chip.key === openChip)?.says ?? "");
  }

  function words(): void {
    const info = tsunagiProgress(game);
    undoButton.textContent = say("undo");
    restartButton.textContent = say("restart");
    checkButton.textContent = say("check");
    cheatButton.textContent = say("cheat");
    cheatButton.title = say("cheatTitle");
    cheatButton.hidden = !(game.cheats && game.answer !== null);
    const over = game.solved || info.outOfStrokes;
    undoButton.disabled = over || game.undo.length === 0;
    restartButton.disabled = game.lines.every((line) => line.length === 0);
    checkButton.disabled = over;
    cheatButton.disabled = over;
    padButtons.out!.setAttribute("aria-label", say("zoomOut"));
    padButtons.in!.setAttribute("aria-label", say("zoomIn"));
    for (const name of ["left", "up", "down", "right"]) padButtons[name]!.setAttribute("aria-label", say(name));
    fitButton.textContent = say("fit");
    pad.setAttribute("aria-label", say("zoomLabel"));
    host.dataset.solved = String(game.solved);
    host.dataset.strokes = String(info.strokes);
    host.dataset.joined = String(info.joined);
    host.dataset.filled = String(info.filled);
    if (!withControls) return;
    hint.textContent = say("hint");
    progress.textContent = game.solved ? say("solved") : info.joined === info.pairs && info.filled < info.cells ? say("fullButEmpty", { n: info.cells - info.filled }) : say("progress", { joined: info.joined, pairs: info.pairs, percent: Math.round((100 * info.filled) / info.cells) });
    const lines: { text: string; warn?: boolean; name: string }[] = [];
    if (info.strokeLimit !== null) lines.push({ name: "strokes", text: info.outOfStrokes ? say("outOfStrokes") : say("strokesLeft", { n: info.strokesLeft ?? 0, left: info.strokesLeft ?? 0, limit: info.strokeLimit }), warn: info.outOfStrokes });
    if (info.boomIn !== null && !game.solved) {
      const burst = game.exploded === null || shownBlast === null ? "" : `${say(game.exploded)} `;
      lines.push({ name: "boom", text: `${burst}${info.boomIn === 1 ? say("boomNext") : say("boomIn", { n: info.boomIn })}`, warn: info.boomIn === 1 });
    }
    if (game.eased !== null || game.cheated) lines.push({ name: "help", text: say(game.eased === "explosions-off" ? "helpExplosionsOff" : game.eased === "explosions-soft" ? "helpExplosionsSoft" : "helpCheated") });
    if (game.checked !== null) lines.push({ name: "check", text: game.checked.unjoined > 0 ? say("checkMissing", { n: game.checked.unjoined }) : say("checkEmpty", { n: game.checked.empty }) });
    messages.replaceChildren(
      ...lines.map((line) => {
        const one = create(document, "p", "tsp-message", line.text);
        one.dataset.message = line.name;
        if (line.warn === true) one.dataset.warn = "true";
        return one;
      }),
    );
  }

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
    const still = JSON.stringify([shownFlags, shownBlast, g.solved, look.marks, look.fill, look.board, look.colours, look.coordinates, language, g.layout.size]);
    const key = JSON.stringify([g.lines, still]);
    if (force || key !== drawnKey) {
      drawnKey = key;
      const patched = !force && drawnLines !== null && still === drawnStill && !g.layout.cells.includes(CELL_BRIDGE) && patch(g, drawnLines);
      if (!patched) inner.innerHTML = drawTsunagi(g.layout, { ...look, lines: g.lines, flagged: shownFlags ?? [], blasted: shownBlast ?? [], done: g.solved, language });
      drawnLines = g.lines;
      drawnStill = still;
    }
    box.dataset.over = String(over);
    words();
  }

  /** Bring the game's flags and bursts onto the board for a moment. */
  function showTransient(): void {
    window.clearTimeout(flagTimer);
    window.clearTimeout(blastTimer);
    shownFlags = game.flagged;
    shownBlast = game.blasted;
    if (shownFlags !== null) flagTimer = window.setTimeout(() => ((shownFlags = null), render()), FLASH_MS);
    if (shownBlast !== null) blastTimer = window.setTimeout(() => ((shownBlast = null), render()), BLAST_MS);
  }

  function pointAt(clientX: number, clientY: number): number | null {
    const svg = inner.querySelector("svg");
    if (svg === null) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    return cellAtPoint(geometry, ((clientX - rect.left) / rect.width) * geometry.side, ((clientY - rect.top) / rect.height) * geometry.side);
  }

  function after(before: TsunagiGame): void {
    if (game === before) return;
    const changed = game.lines !== before.lines;
    showTransient();
    render();
    if (changed) tell("tsunagi-change", detail(), callbacks.onChange);
  }

  /** A tap or press on a portal shows its link to the other ring for a moment: a pointer that hovers sees it by itself, a finger has no hover. */
  function showLink(cell: number): void {
    if (!game.layout.portals.has(cell)) return;
    const group = inner.querySelector(`.tsu-portal-end[data-cell="${cell}"]`)?.parentElement;
    if (group === null || group === undefined) return;
    group.setAttribute("data-linked", "true");
    window.clearTimeout(linkTimer);
    linkTimer = window.setTimeout(() => group.removeAttribute("data-linked"), LINK_MS);
  }

  function press(event: PointerEvent): void {
    if (pointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    const cell = pointAt(event.clientX, event.clientY);
    if (cell === null) return;
    showLink(cell);
    const before = game;
    const next = pressGame(before, cell);
    if (next === before) return;
    event.preventDefault();
    box.setPointerCapture?.(event.pointerId);
    pointer = { id: event.pointerId, cell, x: event.clientX, y: event.clientY };
    game = next;
    after(before);
    if (view.zoom > 1 && frame === 0) frame = window.requestAnimationFrame(nudge);
  }
  function drag(clientX: number, clientY: number): void {
    if (pointer === null) return;
    pointer.x = clientX;
    pointer.y = clientY;
    const cell = pointAt(clientX, clientY);
    if (cell === null || cell === pointer.cell) return;
    pointer.cell = cell;
    const before = game;
    game = dragGame(before, cell);
    after(before);
  }
  function lift(event: PointerEvent): void {
    if (pointer === null || pointer.id !== event.pointerId) return;
    pointer = null;
    const before = game;
    game = liftGame(before);
    const stroked = game.strokes !== before.strokes;
    after(before);
    if (!stroked) return;
    tell("tsunagi-stroke", detail(), callbacks.onStroke);
    if (game.exploded !== null) tell("tsunagi-explosion", detail({ explosion: { kind: game.exploded, cells: game.blasted ?? [] } }), callbacks.onExplosion);
    if (game.solved && !solvedTold) {
      solvedTold = true;
      tell("tsunagi-solve", detail(), callbacks.onSolve);
    }
  }
  /** While a line is dragged near an edge of a zoomed board, the view moves toward it, a little each frame, and the line carries on under the finger. */
  function nudge(): void {
    frame = 0;
    if (pointer === null || view.zoom <= 1) return;
    const rect = box.getBoundingClientRect();
    const { dx, dy } = edgeNudge(pointer.x, pointer.y, rect);
    if (dx !== 0 || dy !== 0) {
      view = keptView({ ...view, x: view.x + dx, y: view.y + dy }, rect.width);
      applyView();
      drag(pointer.x, pointer.y);
    }
    frame = window.requestAnimationFrame(nudge);
  }

  const onDown = (event: PointerEvent): void => press(event);
  const onMove = (event: PointerEvent): void => {
    if (pointer !== null && pointer.id === event.pointerId) drag(event.clientX, event.clientY);
  };
  const onWheel = (event: WheelEvent): void => {
    if (!zooming()) return;
    event.preventDefault();
    const rect = box.getBoundingClientRect();
    const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002));
    view = zoomedAbout(view, factor, event.clientX - rect.left, event.clientY - rect.top, rect.width);
    applyView();
  };
  const onKey = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      api.undo();
    }
  };
  box.addEventListener("pointerdown", onDown);
  box.addEventListener("pointermove", onMove);
  box.addEventListener("pointerup", lift);
  box.addEventListener("pointercancel", lift);
  box.addEventListener("wheel", onWheel, { passive: false });
  host.addEventListener("keydown", onKey);
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
    const width = box.getBoundingClientRect().width;
    if (width === boxWidth) return;
    boxWidth = width;
    view = keptView(view, boxWidth);
    applyView();
  });
  resize?.observe(box);
  const watching = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
    if (explicitLanguage !== undefined) return;
    const next = tsunagiLanguageOf(host.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
    if (next === language) return;
    language = next;
    renderChips();
    render(true);
  });
  watching?.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  /** Room for every line of words this level can ever show, so nothing under the board moves as they come and go. */
  function reserve(next: TsunagiGame): void {
    // What Check says and what an explosion says can run to two lines on a phone; the stroke count is one.
    const lines = 2 + (next.layout.strokes !== null ? 1 : 0) + (next.layout.explosions !== null ? 2 : 0) + (next.cheats || next.eased !== null ? 2 : 0);
    messages.style.minHeight = `${(lines * 1.4 + 0.1).toFixed(1)}em`;
  }

  function begin(next: TsunagiGame): void {
    window.clearTimeout(flagTimer);
    window.clearTimeout(blastTimer);
    game = next;
    shownFlags = null;
    shownBlast = null;
    solvedTold = next.solved;
    openChip = null;
    view = TSUNAGI_FITTED;
    geometry = tsunagiGeometry(next.layout, { coordinates: look.coordinates });
    reserve(next);
    renderChips();
    applyView();
    render(true);
  }

  const api: TsunagiMount = {
    host,
    game: () => game,
    progress: () => tsunagiProgress(game),
    load: (next) => {
      const made = newTsunagiGame(next.givens, next.size, { answer: next.answer, explosions, cheats, lines: next.lines });
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
      renderChips();
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
      applyView();
    },
    destroy: () => {
      window.clearTimeout(flagTimer);
      window.clearTimeout(blastTimer);
      window.clearTimeout(linkTimer);
      window.cancelAnimationFrame(frame);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", lift);
      box.removeEventListener("pointercancel", lift);
      box.removeEventListener("wheel", onWheel);
      host.removeEventListener("keydown", onKey);
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

  begin(game);
  boxWidth = box.getBoundingClientRect().width;
  applyView();
  return api;
}
