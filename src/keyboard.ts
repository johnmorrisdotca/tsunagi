import { create } from "./chrome.ts";
import { CELL_BLOCKED } from "./code.ts";
import { dragGame, pressGame, type TsunagiGame } from "./game.ts";
import type { TsunagiGeometry } from "./geometry.ts";
import { NO_REACH } from "./lines.ts";
import { keptView, type TsunagiView } from "./viewport.ts";

type TsunagiKeyboardInput = {
  host: HTMLElement;
  box: HTMLElement;
  inner: HTMLElement;
  document: Document;
  game: () => TsunagiGame;
  setGame: (game: TsunagiGame) => void;
  size: () => number;
  say: (key: string, values?: Record<string, string | number>) => string;
  geometry: () => TsunagiGeometry;
  view: () => TsunagiView;
  setView: (view: TsunagiView) => void;
  applyView: () => void;
  /** A finger or the mouse is already down on the board. */
  drawing: () => boolean;
  finishStroke: () => void;
  undo: () => void;
  after: (before: TsunagiGame) => void;
};

export type TsunagiKeyboard = {
  paint: () => void;
  reset: (cell: number) => void;
  stop: () => void;
};

/**
 * DRAWING A LINE FROM THE KEYBOARD: arrows move a cursor, Enter and Space
 * start and finish a line, and a zoomed board keeps that cell on screen.
 * @param input - The board and the live game the keys read.
 * @returns How to draw the cursor again, and how to take the keys off.
 */
export function attachTsunagiKeyboard(input: TsunagiKeyboardInput): TsunagiKeyboard {
  const { host, box, inner, document } = input;
  let keyboardCell = input.game().layout.ends[0]?.[0] ?? 0;
  const keyboardStatus = create(document, "p", "tsp-key-status");
  keyboardStatus.setAttribute("aria-live", "polite");
  host.append(keyboardStatus);
  box.tabIndex = 0;
  box.setAttribute("role", "application");

  function paint(): void {
    const game = input.game();
    const size = input.size();
    const say = input.say;
    if (keyboardCell >= game.layout.cells.length || game.layout.cells[keyboardCell] === CELL_BLOCKED)
      keyboardCell = game.layout.ends[0]?.[0] ?? 0;
    box.dataset.keyboardCell = String(keyboardCell);
    box.setAttribute("aria-label", say("keyboardHelp"));
    keyboardStatus.textContent = say("keyboardCell", {
      row: Math.floor(keyboardCell / size) + 1,
      col: (keyboardCell % size) + 1,
    });
    const svg = inner.querySelector("svg");
    if (!svg) return;
    svg.querySelector(".tsp-key-cursor")?.remove();
    const point = input.geometry().centre(keyboardCell);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "tsp-key-cursor");
    circle.setAttribute("aria-hidden", "true");
    circle.setAttribute("cx", String(point.x));
    circle.setAttribute("cy", String(point.y));
    circle.setAttribute("r", "44");
    svg.append(circle);
  }

  function showCell(): void {
    const view = input.view();
    if (view.zoom <= 1) return;
    const svg = inner.querySelector("svg");
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const centre = input.geometry().centre(keyboardCell);
    const point = svg.createSVGPoint();
    point.x = centre.x;
    point.y = centre.y;
    const at = point.matrixTransform(matrix);
    const rect = box.getBoundingClientRect();
    const margin = 28;
    const dx =
      at.x < rect.left + margin
        ? rect.left + margin - at.x
        : at.x > rect.right - margin
          ? rect.right - margin - at.x
          : 0;
    const dy =
      at.y < rect.top + margin
        ? rect.top + margin - at.y
        : at.y > rect.bottom - margin
          ? rect.bottom - margin - at.y
          : 0;
    if (dx || dy) {
      input.setView(keptView({ ...view, x: view.x + dx, y: view.y + dy }, rect.width, rect.height));
      input.applyView();
    }
  }

  const onKey = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      input.undo();
      return;
    }
    if (event.target !== box || input.drawing() || event.ctrlKey || event.metaKey || event.altKey) return;
    const gameNow = input.game();
    const size = input.size();
    const key = event.key.toLowerCase();
    if (key === "enter" || key === " ") {
      event.preventDefault();
      if (gameNow.drawing !== null) input.finishStroke();
      else {
        const before = gameNow;
        input.setGame(pressGame(before, keyboardCell));
        input.after(before);
        paint();
      }
      return;
    }
    if (key === "escape" && gameNow.drawing !== null) {
      event.preventDefault();
      const before = gameNow;
      input.setGame({ ...before, lines: before.before ?? before.lines, drawing: null, before: null });
      input.after(before);
      paint();
      return;
    }
    const move = (
      {
        arrowup: [-1, 0],
        arrowright: [0, 1],
        arrowdown: [1, 0],
        arrowleft: [0, -1],
        ...(gameNow.layout.hex ? { q: [1, -1], e: [-1, 1] } : {}),
      } as Record<string, number[]>
    )[key];
    const dRow = move?.[0];
    const dCol = move?.[1];
    if (dRow === undefined || dCol === undefined) return;
    event.preventDefault();
    let row = Math.floor(keyboardCell / size) + dRow;
    let col = (keyboardCell % size) + dCol;
    if (gameNow.layout.wrap) {
      row = (row + size) % size;
      col = (col + size) % size;
    }
    if (row < 0 || col < 0 || row >= size || col >= size) return;
    const next = row * size + col;
    if (gameNow.layout.cells[next] === CELL_BLOCKED) return;
    if (gameNow.drawing !== null) {
      const before = gameNow;
      let game = dragGame(before, next);
      if (game === before) return;
      keyboardCell = game.lines[game.drawing!]?.at(-1) ?? next;
      game = { ...game, reach: NO_REACH };
      input.setGame(game);
      input.after(before);
    } else keyboardCell = next;
    paint();
    showCell();
  };
  host.addEventListener("keydown", onKey);

  return {
    paint,
    reset: (cell) => {
      keyboardCell = cell;
    },
    stop: () => host.removeEventListener("keydown", onKey),
  };
}
