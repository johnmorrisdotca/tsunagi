/**
 * A BIG BOARD LOOKED AT THROUGH A BOX: from 10×10 up, a phone's cells are
 * smaller than a thumb, so the board is drawn up to three times the box's width
 * and looked at through it, zoomed and moved by a pad of buttons, the wheel
 * and (while a line is dragged) the box's edge, never by scrolling the page.
 * This is only the arithmetic of the view; `mountTsunagi` does the rest.
 *
 * A view is a zoom (1 is the whole board fitted to the box) and where the
 * board's top left sits in the box, which is never past the box's own edges.
 */
export type TsunagiView = { zoom: number; x: number; y: number };

/** The smallest board a player is given the pad for. */
export const TSUNAGI_ZOOM_FROM = 10;

/** How far a board may be zoomed in, as a multiple of the whole board fitted to its box. */
export const TSUNAGI_MOST_ZOOM = 3;

/** How near an edge of the box a line's end must be dragged to move the view, and how far each frame moves it, in pixels. */
export const TSUNAGI_EDGE = 36;
export const TSUNAGI_EDGE_STEP = 6;

/** The whole board, fitted. */
export const TSUNAGI_FITTED: TsunagiView = { zoom: 1, x: 0, y: 0 };

/** A view kept inside the board: never a gap between the board's edge and the box's. `box` is the box's width in pixels. */
export function keptView(view: TsunagiView, box: number): TsunagiView {
  const zoom = Math.min(TSUNAGI_MOST_ZOOM, Math.max(1, view.zoom));
  const least = box - box * zoom;
  return { zoom, x: Math.min(0, Math.max(least, view.x)), y: Math.min(0, Math.max(least, view.y)) };
}

/** A view zoomed by `factor` about the point (px, py) of the box, which stays over the same spot of the board. */
export function zoomedAbout(view: TsunagiView, factor: number, px: number, py: number, box: number): TsunagiView {
  const zoom = Math.min(TSUNAGI_MOST_ZOOM, Math.max(1, view.zoom * factor));
  const scale = zoom / view.zoom;
  return keptView({ zoom, x: px - (px - view.x) * scale, y: py - (py - view.y) * scale }, box);
}

/** How far to move a zoomed view in a frame, for a finger at (x, y) in a box: toward the edge it is near, or not at all. */
export function edgeNudge(x: number, y: number, box: { left: number; top: number; right: number; bottom: number }): { dx: number; dy: number } {
  const dx = x - box.left < TSUNAGI_EDGE ? TSUNAGI_EDGE_STEP : box.right - x < TSUNAGI_EDGE ? -TSUNAGI_EDGE_STEP : 0;
  const dy = y - box.top < TSUNAGI_EDGE ? TSUNAGI_EDGE_STEP : box.bottom - y < TSUNAGI_EDGE ? -TSUNAGI_EDGE_STEP : 0;
  return { dx, dy };
}
