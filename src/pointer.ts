import { dragGame, pressGame, type TsunagiGame } from "./game.ts";
import { cellAtPoint, type TsunagiGeometry } from "./geometry.ts";
import { edgeNudge, keptView, type TsunagiView } from "./viewport.ts";

/** How long a tapped portal shows its link to the other ring. */
const LINK_MS = 1800;

type TsunagiPointerInput = {
  box: HTMLElement;
  inner: HTMLElement;
  game: () => TsunagiGame;
  setGame: (game: TsunagiGame) => void;
  geometry: () => TsunagiGeometry;
  view: () => TsunagiView;
  setView: (view: TsunagiView) => void;
  applyView: () => void;
  after: (before: TsunagiGame) => void;
  finishStroke: () => void;
};

export type TsunagiPointer = {
  /** A press is down and a line may be following it. */
  drawing: () => boolean;
  stop: () => void;
};

/**
 * PRESS AND DRAG ON THE BOARD. A drag that leaves the board still ends, and
 * a line dragged near the edge of a zoomed board moves the view toward it.
 * @param input - The board and the live game a press reads.
 * @returns Whether a press is down, and how to take the listeners off.
 */
export function attachTsunagiPointer(input: TsunagiPointerInput): TsunagiPointer {
  const { box, inner } = input;
  let pointer: { id: number; cell: number | null; x: number; y: number } | null = null;
  let frame = 0;
  let linkTimer = 0;

  function pointAt(clientX: number, clientY: number): number | null {
    const svg = inner.querySelector("svg");
    if (svg === null) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    const geometry = input.geometry();
    return cellAtPoint(
      geometry,
      ((clientX - rect.left) / rect.width) * geometry.side,
      ((clientY - rect.top) / rect.height) * geometry.side,
    );
  }

  /** A tap or press on a portal shows its link to the other ring for a moment: a pointer that hovers sees it by itself, a finger has no hover. */
  function showLink(cell: number): void {
    if (!input.game().layout.portals.has(cell)) return;
    const group = inner.querySelector(`.tsu-portal-end[data-cell="${cell}"]`)?.parentElement;
    if (group === null || group === undefined) return;
    group.setAttribute("data-linked", "true");
    window.clearTimeout(linkTimer);
    linkTimer = window.setTimeout(() => group.removeAttribute("data-linked"), LINK_MS);
  }

  function drag(clientX: number, clientY: number): void {
    if (pointer === null) return;
    pointer.x = clientX;
    pointer.y = clientY;
    const cell = pointAt(clientX, clientY);
    if (cell === null || cell === pointer.cell) return;
    pointer.cell = cell;
    const before = input.game();
    input.setGame(dragGame(before, cell));
    input.after(before);
  }

  /** While a line is dragged near an edge of a zoomed board, the view moves toward it, a little each frame, and the line carries on under the finger. */
  function nudge(): void {
    frame = 0;
    if (pointer === null || input.view().zoom <= 1) return;
    const rect = box.getBoundingClientRect();
    const { dx, dy } = edgeNudge(pointer.x, pointer.y, rect);
    if (dx !== 0 || dy !== 0) {
      const view = input.view();
      input.setView(keptView({ ...view, x: view.x + dx, y: view.y + dy }, rect.width));
      input.applyView();
      drag(pointer.x, pointer.y);
    }
    frame = window.requestAnimationFrame(nudge);
  }

  function press(event: PointerEvent): void {
    if (pointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    const cell = pointAt(event.clientX, event.clientY);
    if (cell === null) return;
    showLink(cell);
    const before = input.game();
    const next = pressGame(before, cell);
    if (next === before) return;
    event.preventDefault();
    box.setPointerCapture?.(event.pointerId);
    pointer = { id: event.pointerId, cell, x: event.clientX, y: event.clientY };
    input.setGame(next);
    input.after(before);
    if (input.view().zoom > 1 && frame === 0) frame = window.requestAnimationFrame(nudge);
  }

  function lift(event: PointerEvent): void {
    if (pointer === null || pointer.id !== event.pointerId) return;
    pointer = null;
    input.finishStroke();
  }

  const onDown = (event: PointerEvent): void => press(event);
  const onMove = (event: PointerEvent): void => {
    if (pointer !== null && pointer.id === event.pointerId) drag(event.clientX, event.clientY);
  };
  box.addEventListener("pointerdown", onDown);
  box.addEventListener("pointermove", onMove);
  box.addEventListener("pointerup", lift);
  box.addEventListener("pointercancel", lift);

  return {
    drawing: () => pointer !== null,
    stop: () => {
      window.clearTimeout(linkTimer);
      window.cancelAnimationFrame(frame);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", lift);
      box.removeEventListener("pointercancel", lift);
    },
  };
}
