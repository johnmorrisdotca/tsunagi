import { type TsunagiGame, tsunagiProgress } from "./game.ts";
import { challengesOf, tsunagiMarks, tsunagiRole } from "./ladder.ts";
import type { Challenge } from "./ladder.types.ts";
import type { TsunagiSet } from "./levelCounts.ts";
import type { TsunagiLanguage } from "./strings.ts";
import { keptView, TSUNAGI_FITTED, type TsunagiView, zoomedAbout } from "./viewport.ts";

const CHALLENGE_KEYS: readonly Challenge[] = [
  "bridges",
  "walls",
  "waypoints",
  "wrap",
  "portals",
  "explosions",
  "strokes",
  "hexagon",
  "sparse",
];

/** An element of the board's chrome.
 * @param document - The document the element belongs to.
 * @param tag - The element's tag.
 * @param className - The element's class.
 * @param text - The element's text, when it has any.
 * @returns The element.
 */
export function create<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

type TsunagiChromeInput = {
  host: HTMLElement;
  document: Document;
  box: HTMLElement;
  inner: HTMLElement;
  withControls: boolean;
  withChips: boolean;
  game: () => TsunagiGame;
  view: () => TsunagiView;
  setView: (view: TsunagiView) => void;
  boxWidth: () => number;
  zooming: () => boolean;
  say: (key: string, values?: Record<string, string | number>) => string;
  language: () => TsunagiLanguage;
  size: () => number;
  level: () => number | undefined;
  set: () => TsunagiSet;
  givens: () => string;
  shownBlast: () => readonly number[] | null;
  undo: () => void;
  restart: () => void;
  check: () => void;
  cheat: () => void;
  fit: () => void;
};

export type TsunagiChrome = {
  applyView: () => void;
  renderChips: () => void;
  words: () => void;
  reserve: (next: TsunagiGame) => void;
  closeChip: () => void;
};

/**
 * THE WORDS AND BUTTONS UNDER THE BOARD, and the pad that zooms a big board.
 * The drawing of the lines stays in `mount.ts`.
 * @param input - The elements and the live board the chrome reads.
 * @returns How to draw the chrome again.
 */
export function createTsunagiChrome(input: TsunagiChromeInput): TsunagiChrome {
  const { host, document, box, inner, withControls, withChips } = input;
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

  const button = (
    name: string,
    onPress: () => void,
    parent: HTMLElement,
    className = "tsp-button",
  ): HTMLButtonElement => {
    const one = create(document, "button", className);
    one.type = "button";
    one.dataset.action = name;
    one.addEventListener("click", onPress);
    parent.append(one);
    return one;
  };
  const undoButton = button("undo", () => input.undo(), controls);
  const restartButton = button("restart", () => input.restart(), controls);
  const checkButton = button("check", () => input.check(), controls);
  const cheatButton = button("cheat", () => input.cheat(), controls);
  const padButtons: Record<string, HTMLButtonElement> = {};
  const padMoves: Record<string, (view: TsunagiView, width: number) => TsunagiView> = {
    out: (view, width) => zoomedAbout(view, 1 / 1.5, width / 2, width / 2, width),
    in: (view, width) => zoomedAbout(view, 1.5, width / 2, width / 2, width),
    left: (view, width) => ({ ...view, x: view.x + Math.round(width / 4) }),
    up: (view, width) => ({ ...view, y: view.y + Math.round(width / 4) }),
    down: (view, width) => ({ ...view, y: view.y - Math.round(width / 4) }),
    right: (view, width) => ({ ...view, x: view.x - Math.round(width / 4) }),
  };
  for (const [name, glyph] of [
    ["out", "−"],
    ["in", "+"],
    ["left", "←"],
    ["up", "↑"],
    ["down", "↓"],
    ["right", "→"],
  ] as const) {
    const one = button(name, () => changeView(padMoves[name]!), pad);
    one.textContent = glyph;
    padButtons[name] = one;
  }
  const fitButton = button("fit", () => input.fit(), pad);

  function applyView(): void {
    const on = input.zooming();
    pad.hidden = !on;
    if (!on) input.setView(TSUNAGI_FITTED);
    const view = input.view();
    const boxWidth = input.boxWidth();
    inner.style.width = on && boxWidth > 0 ? `${boxWidth * view.zoom}px` : "100%";
    inner.style.transform = on && view.zoom !== 1 ? `translate(${view.x}px, ${view.y}px)` : "";
    box.dataset.zoom = view.zoom.toFixed(2);
    fitButton.disabled = view.zoom === 1;
    padButtons.out!.disabled = view.zoom === 1;
    padButtons.in!.disabled = view.zoom >= 3;
  }
  function changeView(next: (view: TsunagiView, width: number) => TsunagiView): void {
    input.setView(keptView(next(input.view(), input.boxWidth()), input.boxWidth()));
    applyView();
  }

  let openChip: string | null = null;

  function renderChips(): void {
    const say = input.say;
    const language = input.language();
    const size = input.size();
    const level = input.level();
    const set = input.set();
    chips.replaceChildren();
    chips.hidden = !withChips;
    says.hidden = !withChips;
    if (!withChips) return;
    const keys: { key: string; label: string; strong: boolean; says: string }[] = [];
    const marks = level === undefined ? null : tsunagiMarks(size, level, set);
    if (marks !== null) keys.push({ key: "difficulty", label: "", strong: false, says: say("difficultySays") });
    const role = level === undefined ? null : tsunagiRole(size, level, set);
    if (role?.role === "teaches" && role.newOnes.length > 0)
      keys.push({
        key: "teaches",
        label: say("teaches", { what: role.newOnes.map((each) => say(each)).join(language === "ja" ? "、" : " and ") }),
        strong: true,
        says: say("teachesSays"),
      });
    if (role?.role === "tests") keys.push({ key: "tests", label: say("tests"), strong: true, says: say("testsSays") });
    for (const challenge of challengesOf(input.givens()))
      if (CHALLENGE_KEYS.includes(challenge))
        keys.push({ key: challenge, label: say(challenge), strong: false, says: say(`${challenge}Says`) });
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
    const say = input.say;
    const game = input.game();
    const shownBlast = input.shownBlast();
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
    progress.textContent = game.solved
      ? say("solved")
      : info.joined === info.pairs && info.filled < info.cells
        ? say("fullButEmpty", { n: info.cells - info.filled })
        : say("progress", {
            joined: info.joined,
            pairs: info.pairs,
            percent: Math.round((100 * info.filled) / info.cells),
          });
    const lines: { text: string; warn?: boolean; name: string }[] = [];
    if (info.strokeLimit !== null)
      lines.push({
        name: "strokes",
        text: info.outOfStrokes
          ? say("outOfStrokes")
          : say("strokesLeft", { n: info.strokesLeft ?? 0, left: info.strokesLeft ?? 0, limit: info.strokeLimit }),
        warn: info.outOfStrokes,
      });
    if (info.boomIn !== null && !game.solved) {
      const burst = game.exploded === null || shownBlast === null ? "" : `${say(game.exploded)} `;
      lines.push({
        name: "boom",
        text: `${burst}${info.boomIn === 1 ? say("boomNext") : say("boomIn", { n: info.boomIn })}`,
        warn: info.boomIn === 1,
      });
    }
    if (game.eased !== null || game.cheated)
      lines.push({
        name: "help",
        text: say(
          game.eased === "explosions-off"
            ? "helpExplosionsOff"
            : game.eased === "explosions-soft"
              ? "helpExplosionsSoft"
              : "helpCheated",
        ),
      });
    if (game.checked !== null)
      lines.push({
        name: "check",
        text:
          game.checked.unjoined > 0
            ? say("checkMissing", { n: game.checked.unjoined })
            : say("checkEmpty", { n: game.checked.empty }),
      });
    messages.replaceChildren(
      ...lines.map((line) => {
        const one = create(document, "p", "tsp-message", line.text);
        one.dataset.message = line.name;
        if (line.warn === true) one.dataset.warn = "true";
        return one;
      }),
    );
  }

  /** Room for every line of words this level can ever show, so nothing under the board moves as they come and go.
   * @param next - The game whose words the board must leave room for.
   */
  function reserve(next: TsunagiGame): void {
    // What Check says and what an explosion says can run to two lines on a phone; the stroke count is one.
    const lines =
      2 +
      (next.layout.strokes !== null ? 1 : 0) +
      (next.layout.explosions !== null ? 2 : 0) +
      (next.cheats || next.eased !== null ? 2 : 0);
    messages.style.minHeight = `${(lines * 1.4 + 0.1).toFixed(1)}em`;
  }

  return {
    applyView,
    renderChips,
    words,
    reserve,
    closeChip: () => {
      openChip = null;
    },
  };
}
