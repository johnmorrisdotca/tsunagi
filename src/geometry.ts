import { type LinkLayout, onTheBoard, stepBetween } from "./code.ts";

/**
 * WHERE EVERYTHING IS ON A DRAWN BOARD, in the drawing's own units: a square
 * cell is 100 across, the drawing is a square box, and a point in the box is
 * the cell it is over. The same arithmetic places the drawing (`drawTsunagi`)
 * and finds the cell under a finger (`cellAtPoint`), so they cannot disagree.
 *
 * A square board is a grid of squares. A hexagon is a honeycomb: the cells of
 * the square code slid half a cell along per row and packed together, each
 * drawn pointy-top, with the square's corners left off. A board that wraps is
 * drawn with a ring of ghost cells all round it, the far edge's cells faded,
 * so a line is seen to leave one side and come back on the other.
 *
 * Pure: no page needed.
 */

/** A point in the drawing.
 *
 * @example
 * ```ts
 * import type { TsunagiPoint } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const value: TsunagiPoint = {x:10,y:20};
 * console.log(value);
 * ```
 */
export type TsunagiPoint = { x: number; y: number };

/** How wide a cell is in the drawing's units.
 *
 * @example
 * ```ts
 * import { CELL } from "@johnmorrisdotca/tsunagi/draw";
 * console.log(CELL);
 * ```
 */
export const CELL = 100;

/** The frame round the playing surface, in the drawing's units.
 *
 * @example
 * ```ts
 * import { FRAME } from "@johnmorrisdotca/tsunagi/draw";
 * console.log(FRAME);
 * ```
 */
export const FRAME = 14;

/** The room the row numbers and column letters take on every side, where they are drawn.
 *
 * @example
 * ```ts
 * import { COORDINATE_ROOM } from "@johnmorrisdotca/tsunagi/draw";
 * console.log(COORDINATE_ROOM);
 * ```
 */
export const COORDINATE_ROOM = 34;

/** Rows of a honeycomb are this much closer than a square's: cos 30°. */
const ROW = Math.sqrt(3) / 2;

/** A hexagon's centre to its corner, in cells: a pointy-top hexagon one cell wide.
 *
 * @example
 * ```ts
 * import { HEX_RADIUS } from "@johnmorrisdotca/tsunagi/draw";
 * console.log(HEX_RADIUS);
 * ```
 */
export const HEX_RADIUS = 0.5 / ROW;

/** The board dimensions, cell centres and playable-cell mapping used by SVG and pointer input.
 *
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 * import { tsunagiGeometry } from "@johnmorrisdotca/tsunagi/draw";
 * import type { TsunagiGeometry } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const geometry = tsunagiGeometry(layout);
 * const value: TsunagiGeometry = geometry;
 * console.log(value);
 * ```
 */
export type TsunagiGeometry = {
  size: number;
  hex: boolean;
  /** One ghost cell all round, on a board that wraps. */
  ring: number;
  /** Whether the drawing has the board's coordinates down its sides. */
  coordinates: boolean;
  /** The drawing's longer side, in its units: its width and height on any board of a whole square or a plain hexagon. */
  side: number;
  /** The drawing's width and height, in its units: unlike each other only on a board with a shape. */
  width: number;
  height: number;
  /** The first column and row of the square that are on the board: not 0 only where a shape leaves the square's first columns or rows off. */
  first: { col: number; row: number };
  /** How many columns and rows of the square are on the board. */
  cols: number;
  rows: number;
  /** Where the playing surface starts and how far it goes, inside the frame and the coordinates. */
  paper: { x: number; y: number; width: number; height: number };
  /** The middle of a cell, in the drawing; for a hexagon, only of the cells on the board. */
  centre: (cell: number) => TsunagiPoint;
  /** Whether a cell is on the board: every one of a square, only the hexagon's own of a honeycomb. */
  onBoard: (cell: number) => boolean;
};

/** Coordinate labels and wrap ghost-cell choices for geometry.
 *
 * @example
 * ```ts
 * import type { GeometryOptions } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const value: GeometryOptions = {coordinates:true};
 * console.log(value);
 * ```
 */
export type GeometryOptions = {
  coordinates?: boolean;
  ghosts?: boolean;
  /** Only the playing surface: no frame and no coordinates, so the drawing's box is exactly the cells. */
  surface?: boolean;
};

/** The geometry of a layout's drawing. `coordinates` leaves room for row numbers and column letters (not on a board that wraps or a hexagon); `ghosts` false leaves out the ring of a board that wraps.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param options - Native drawing, geometry, game or mount settings.
 * @returns The geometry of a layout's drawing. `coordinates` leaves room for row numbers and column letters (not on a board that wraps or a hexagon); `ghosts` false leaves out the ring of a board that wraps.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 * import { tsunagiGeometry } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(tsunagiGeometry(layout).centre(0));
 * ```
 */
export function tsunagiGeometry(layout: LinkLayout, options: GeometryOptions = {}): TsunagiGeometry {
  const { size, hex } = layout;
  const ring = layout.wrap && !hex && options.ghosts !== false ? 1 : 0;
  const surface = options.surface === true;
  const coordinates = options.coordinates === true && !layout.wrap && !hex && !surface;
  const room = surface ? 0 : FRAME + (coordinates ? COORDINATE_ROOM : 0);
  const onBoard = (cell: number): boolean => onTheBoard(layout, cell);
  // On a board with a shape the drawing is as big as what is on the board, and no bigger.
  const shaped = layout.off !== undefined && layout.off.size > 0;
  if (!hex) {
    const kept = shaped ? Array.from({ length: size * size }, (_, cell) => cell).filter(onBoard) : [0, size * size - 1];
    const first = {
      col: shaped ? Math.min(...kept.map((cell) => cell % size)) : 0,
      row: shaped ? Math.min(...kept.map((cell) => Math.floor(cell / size))) : 0,
    };
    const cols = shaped ? Math.max(...kept.map((cell) => cell % size)) - first.col + 1 : size;
    const rows = shaped ? Math.max(...kept.map((cell) => Math.floor(cell / size))) - first.row + 1 : size;
    const origin = room + ring * CELL;
    const width = 2 * origin + cols * CELL;
    const height = 2 * origin + rows * CELL;
    return {
      size,
      hex,
      ring,
      coordinates,
      side: Math.max(width, height),
      width,
      height,
      first,
      cols,
      rows,
      paper: { x: room, y: room, width: (cols + 2 * ring) * CELL, height: (rows + 2 * ring) * CELL },
      centre: (cell) => ({
        x: origin + ((cell % size) - first.col + 0.5) * CELL,
        y: origin + (Math.floor(cell / size) - first.row + 0.5) * CELL,
      }),
      onBoard,
    };
  }
  // A honeycomb: x slides half a cell a row, rows packed to cos 30°. Centre the cells on the board's box.
  const at = (cell: number) => ({ x: (cell % size) + Math.floor(cell / size) / 2, y: Math.floor(cell / size) * ROW });
  const used = Array.from({ length: size * size }, (_, cell) => cell)
    .filter(onBoard)
    .map(at);
  const left = Math.min(...used.map((p) => p.x)) - 0.5;
  const right = Math.max(...used.map((p) => p.x)) + 0.5;
  const top = Math.min(...used.map((p) => p.y)) - HEX_RADIUS;
  const bottom = Math.max(...used.map((p) => p.y)) + HEX_RADIUS;
  const wide = (right - left) * CELL;
  const tall = (bottom - top) * CELL;
  // A plain hexagon sits in the same square box as every board; one with a shape is as big as it is.
  const innerWide = shaped ? wide : Math.max(wide, tall);
  const innerTall = shaped ? tall : Math.max(wide, tall);
  const x0 = room + (innerWide - wide) / 2 - left * CELL;
  const y0 = room + (innerTall - tall) / 2 - top * CELL;
  return {
    size,
    hex,
    ring: 0,
    coordinates: false,
    side: 2 * room + Math.max(innerWide, innerTall),
    width: 2 * room + innerWide,
    height: 2 * room + innerTall,
    first: { col: 0, row: 0 },
    cols: size,
    rows: size,
    paper: { x: room, y: room, width: innerWide, height: innerTall },
    centre: (cell) => ({ x: x0 + at(cell).x * CELL, y: y0 + at(cell).y * CELL }),
    onBoard,
  };
}

/** A hexagon's corners about a centre, pointy at the top, as an SVG points list.
 *
 * @param x - The horizontal point, edge-code or coordinate value specified by this signature.
 * @param y - The vertical point, edge-code or coordinate value specified by this signature.
 * @param radius - The hexagon radius in drawing units.
 * @returns A hexagon's corners about a centre, pointy at the top, as an SVG points list.
 * @example
 * ```ts
 * import { hexagonPoints } from "@johnmorrisdotca/tsunagi/draw";
 *
 * console.log(hexagonPoints(10,10,5));
 * ```
 */
export function hexagonPoints(x: number, y: number, radius: number): string {
  return Array.from({ length: 6 }, (_, k) => {
    const angle = (Math.PI / 3) * k + Math.PI / 6;
    return `${round(x + radius * Math.cos(angle))},${round(y + radius * Math.sin(angle))}`;
  }).join(" ");
}

/** A number as short as it can be written for a drawing: two places.
 *
 * @param value - The number to round or interpret.
 * @returns A number as short as it can be written for a drawing: two places.
 * @example
 * ```ts
 * import { round } from "@johnmorrisdotca/tsunagi/draw";
 *
 * console.log(round(1.23456));
 * ```
 */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The cell under a point of the drawing, or null where there is none: off the
 * board, in the frame, on a hexagon's missing corner. On a board that wraps the
 * ghost cells are the real ones they show. A point is in the nearest cell's
 * hexagon on a honeycomb, which is the one it is in.
 *
 * @param geometry - The board-to-pixel geometry.
 * @param x - The horizontal point, edge-code or coordinate value specified by this signature.
 * @param y - The vertical point, edge-code or coordinate value specified by this signature.
 * @returns The cell under a point of the drawing, or null where there is none: off the board, in the frame, on a hexagon's missing corner. On a board that wraps the ghost cells are the real ones they show. A point is in the nearest cell's hexagon on a honeycomb, which is the one it is in.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 * import { cellAtPoint, tsunagiGeometry } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * const geometry = tsunagiGeometry(layout);
 * console.log(cellAtPoint(geometry,geometry.centre(0).x,geometry.centre(0).y));
 * ```
 */
export function cellAtPoint(geometry: TsunagiGeometry, x: number, y: number): number | null {
  const { size, ring } = geometry;
  if (!geometry.hex) {
    const across = Math.floor((x - geometry.paper.x) / CELL);
    const down = Math.floor((y - geometry.paper.y) / CELL);
    if (across < 0 || down < 0 || across >= geometry.cols + 2 * ring || down >= geometry.rows + 2 * ring) return null;
    const cell =
      ((down - ring + geometry.first.row + size) % size) * size + ((across - ring + geometry.first.col + size) % size);
    return geometry.onBoard(cell) ? cell : null;
  }
  let best: number | null = null;
  let nearest = Infinity;
  for (let cell = 0; cell < size * size; cell += 1) {
    if (!geometry.onBoard(cell)) continue;
    const middle = geometry.centre(cell);
    const apart = Math.hypot(middle.x - x, middle.y - y);
    if (apart < nearest) {
      nearest = apart;
      best = cell;
    }
  }
  return nearest <= CELL * HEX_RADIUS ? best : null;
}

/** How far from the middle of a portal's cell a line stops going in, and starts coming out, as a share of a cell: just inside the ring.
 *
 * @example
 * ```ts
 * import { PORTAL_STUB } from "@johnmorrisdotca/tsunagi/draw";
 * console.log(PORTAL_STUB);
 * ```
 */
export const PORTAL_STUB = 0.3;

/**
 * A line as the runs it is drawn in, each a list of points through its cells'
 * middles. On a board that wraps, a step across the join ends one run a cell
 * out beyond the edge (in the ghost) and starts the next a cell out beyond the
 * other edge, so the line is seen to leave and come back. Through a portal the
 * line is two runs: it ends just inside the ring it went into, and the next
 * starts just inside the ring it comes out of, going on the same way.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param geometry - The board-to-pixel geometry.
 * @param line - The cell sequence of one native line.
 * @returns A line as the runs it is drawn in, each a list of points through its cells' middles. On a board that wraps, a step across the join ends one run a cell out beyond the edge (in the ghost) and starts the next a cell out beyond the other edge, so the line is seen to leave and come back. Through a portal the line is two runs: it ends just inside the ring it went into, and the next starts just inside the ring it comes out of, going on the same way.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
 * import { lineRuns, tsunagiGeometry } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const layout = decodeLayout(givens,4)!;
 * const solvedLines = linesOfAnswer(layout,answer)!;
 * const geometry = tsunagiGeometry(layout);
 * console.log(lineRuns(layout,geometry,solvedLines[0]));
 * ```
 */
export function lineRuns(layout: LinkLayout, geometry: TsunagiGeometry, line: readonly number[]): TsunagiPoint[][] {
  const { size } = layout;
  const point = (cell: number, dx = 0, dy = 0): TsunagiPoint => {
    const middle = geometry.centre(cell);
    return { x: middle.x + dx * CELL, y: middle.y + dy * CELL };
  };
  /** Which way a step goes, as a unit step across and down. */
  const heading = (from: number, to: number): [number, number] => {
    const by = stepBetween(size, from, to, layout.wrap);
    return Math.abs(by) === 1 ? [Math.sign(by), 0] : [0, Math.sign(by)];
  };
  const runs: TsunagiPoint[][] = [[point(line[0]!)]];
  for (let at = 1; at < line.length; at += 1) {
    const from = line[at - 1]!;
    const to = line[at]!;
    // Out of a portal's first cell into its other: the line has been through, and comes out going the way it went in.
    if (layout.portals.get(from) === to && at >= 2) {
      const [dx, dy] = heading(line[at - 2]!, from);
      runs.push([point(to, dx * PORTAL_STUB, dy * PORTAL_STUB)]);
      continue;
    }
    // Into a portal's first cell: it stops just inside the ring, on the side it came in.
    const entering = layout.portals.get(to) === line[at + 1];
    const stop = (cell: number, dx: number, dy: number): TsunagiPoint =>
      entering ? point(cell, -dx * PORTAL_STUB, -dy * PORTAL_STUB) : point(cell);
    const plain =
      layout.hex ||
      stepBetween(size, from, to, false) !== 0 ||
      Math.abs(to - from) === 2 ||
      Math.abs(to - from) === 2 * size;
    if (plain || !layout.wrap) {
      const [dx, dy] = entering ? heading(from, to) : [0, 0];
      runs[runs.length - 1]!.push(stop(to, dx, dy));
      continue;
    }
    const by = stepBetween(size, from, to, true);
    const [dx, dy] = Math.abs(by) === 1 ? [Math.sign(by), 0] : [0, Math.sign(by)];
    runs[runs.length - 1]!.push(point(from, dx, dy));
    runs.push([point(to, -dx, -dy), stop(to, dx, dy)]);
  }
  return runs;
}
