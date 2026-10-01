import { inHex, stepBetween, type LinkLayout } from "./code.ts";

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

/** A point in the drawing. */
export type TsunagiPoint = { x: number; y: number };

/** How wide a cell is in the drawing's units. */
export const CELL = 100;

/** The frame round the playing surface, in the drawing's units. */
export const FRAME = 14;

/** The room the row numbers and column letters take on every side, where they are drawn. */
export const COORDINATE_ROOM = 34;

/** Rows of a honeycomb are this much closer than a square's: cos 30°. */
const ROW = Math.sqrt(3) / 2;

/** A hexagon's centre to its corner, in cells: a pointy-top hexagon one cell wide. */
export const HEX_RADIUS = 0.5 / ROW;

export type TsunagiGeometry = {
  size: number;
  hex: boolean;
  /** One ghost cell all round, on a board that wraps. */
  ring: number;
  /** Whether the drawing has the board's coordinates down its sides. */
  coordinates: boolean;
  /** The drawing's width and height, the same, in its units. */
  side: number;
  /** Where the playing surface starts and how far it goes, inside the frame and the coordinates. */
  paper: { x: number; y: number; width: number; height: number };
  /** The middle of a cell, in the drawing; for a hexagon, only of the cells on the board. */
  centre: (cell: number) => TsunagiPoint;
  /** Whether a cell is on the board: every one of a square, only the hexagon's own of a honeycomb. */
  onBoard: (cell: number) => boolean;
};

export type GeometryOptions = { coordinates?: boolean; ghosts?: boolean };

/** The geometry of a layout's drawing. `coordinates` leaves room for row numbers and column letters (not on a board that wraps or a hexagon); `ghosts` false leaves out the ring of a board that wraps. */
export function tsunagiGeometry(layout: LinkLayout, options: GeometryOptions = {}): TsunagiGeometry {
  const { size, hex } = layout;
  const ring = layout.wrap && !hex && options.ghosts !== false ? 1 : 0;
  const coordinates = options.coordinates === true && !layout.wrap && !hex;
  const room = FRAME + (coordinates ? COORDINATE_ROOM : 0);
  const onBoard = (cell: number): boolean => !hex || inHex(size, cell);
  if (!hex) {
    const origin = room + ring * CELL;
    const across = size * CELL;
    return {
      size,
      hex,
      ring,
      coordinates,
      side: 2 * origin + across,
      paper: { x: room, y: room, width: across + 2 * ring * CELL, height: across + 2 * ring * CELL },
      centre: (cell) => ({ x: origin + ((cell % size) + 0.5) * CELL, y: origin + (Math.floor(cell / size) + 0.5) * CELL }),
      onBoard,
    };
  }
  // A honeycomb: x slides half a cell a row, rows packed to cos 30°. Centre the cells on the board's box.
  const at = (cell: number) => ({ x: (cell % size) + Math.floor(cell / size) / 2, y: Math.floor(cell / size) * ROW });
  const used = Array.from({ length: size * size }, (_, cell) => cell).filter(onBoard).map(at);
  const left = Math.min(...used.map((p) => p.x)) - 0.5;
  const right = Math.max(...used.map((p) => p.x)) + 0.5;
  const top = Math.min(...used.map((p) => p.y)) - HEX_RADIUS;
  const bottom = Math.max(...used.map((p) => p.y)) + HEX_RADIUS;
  const wide = (right - left) * CELL;
  const tall = (bottom - top) * CELL;
  const inner = Math.max(wide, tall);
  const x0 = room + (inner - wide) / 2 - left * CELL;
  const y0 = room + (inner - tall) / 2 - top * CELL;
  return {
    size,
    hex,
    ring: 0,
    coordinates: false,
    side: 2 * room + inner,
    paper: { x: room, y: room, width: inner, height: inner },
    centre: (cell) => ({ x: x0 + at(cell).x * CELL, y: y0 + at(cell).y * CELL }),
    onBoard,
  };
}

/** A hexagon's corners about a centre, pointy at the top, as an SVG points list. */
export function hexagonPoints(x: number, y: number, radius: number): string {
  return Array.from({ length: 6 }, (_, k) => {
    const angle = (Math.PI / 3) * k + Math.PI / 6;
    return `${round(x + radius * Math.cos(angle))},${round(y + radius * Math.sin(angle))}`;
  }).join(" ");
}

/** A number as short as it can be written for a drawing: two places. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The cell under a point of the drawing, or null where there is none: off the
 * board, in the frame, on a hexagon's missing corner. On a board that wraps the
 * ghost cells are the real ones they show. A point is in the nearest cell's
 * hexagon on a honeycomb, which is the one it is in.
 */
export function cellAtPoint(geometry: TsunagiGeometry, x: number, y: number): number | null {
  const { size, ring } = geometry;
  if (!geometry.hex) {
    const across = Math.floor((x - geometry.paper.x) / CELL);
    const down = Math.floor((y - geometry.paper.y) / CELL);
    const span = size + 2 * ring;
    if (across < 0 || down < 0 || across >= span || down >= span) return null;
    return ((down - ring + size) % size) * size + ((across - ring + size) % size);
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

/**
 * A line as the runs it is drawn in, each a list of points through its cells'
 * middles. On a board that wraps, a step across the join ends one run a cell
 * out beyond the edge (in the ghost) and starts the next a cell out beyond the
 * other edge, so the line is seen to leave and come back.
 */
export function lineRuns(layout: LinkLayout, geometry: TsunagiGeometry, line: readonly number[]): TsunagiPoint[][] {
  const { size } = layout;
  const point = (cell: number, dx = 0, dy = 0): TsunagiPoint => {
    const middle = geometry.centre(cell);
    return { x: middle.x + dx * CELL, y: middle.y + dy * CELL };
  };
  const runs: TsunagiPoint[][] = [[point(line[0]!)]];
  for (let at = 1; at < line.length; at += 1) {
    const from = line[at - 1]!;
    const to = line[at]!;
    const plain = layout.hex || stepBetween(size, from, to, false) !== 0 || Math.abs(to - from) === 2 || Math.abs(to - from) === 2 * size;
    if (plain || !layout.wrap) {
      runs[runs.length - 1]!.push(point(to));
      continue;
    }
    const by = stepBetween(size, from, to, true);
    const [dx, dy] = Math.abs(by) === 1 ? [Math.sign(by), 0] : [0, Math.sign(by)];
    runs[runs.length - 1]!.push(point(from, dx, dy));
    runs.push([point(to, -dx, -dy), point(to)]);
  }
  return runs;
}
