/**
 * THE BOARD A TSUNAGI GRID IS DRAWN ON: its paper, the frame round it, the
 * rules of the grid, and the ink of walls, blocked cells and bridges. Six
 * ready-made boards: `paper` (white paper in a wood frame, the one that follows
 * the page's light or dark), `wood`, and the four felts `green`, `blue`, `red`
 * and `black`. Or a look of your own: every part of one is a colour.
 */

/** What a board is made of: every part a CSS colour. */
export type TsunagiBoardLook = {
  /** The playing surface: one colour, or two, a light and a deep one, laid as a soft gradient. */
  paper: string | readonly [string, string];
  /** The frame round the surface. */
  frame: string;
  /** The rules between cells, and the dashed rim of a board that wraps. */
  grid: string;
  /** Walls, blocked cells and a bridge's rails. */
  ink: string;
  /** The letters and numbers down the sides, where they are drawn. */
  coordinate: string;
};

/** The ready-made boards. */
export const TSUNAGI_BOARD_NAMES = ["paper", "wood", "green", "blue", "red", "black"] as const;
export type TsunagiBoardName = (typeof TSUNAGI_BOARD_NAMES)[number];

/** The default: paper, which takes its colours from the page (`--tsu-paper` and the rest of `TSUNAGI_STYLE`), light or dark. */
export const TSUNAGI_DEFAULT_BOARD: TsunagiBoardName = "paper";

/** Every ready-made board's look. `paper` is the page's own light look, written out; drawn by name it is left to the style, so a page can change it. */
export const TSUNAGI_BOARDS: Record<TsunagiBoardName, TsunagiBoardLook> = {
  paper: { paper: "#fbf8f1", frame: "#a98954", grid: "#cfc6b2", ink: "#1f2320", coordinate: "#7c5a30" },
  wood: { paper: ["#f0cf95", "#d3a662"], frame: "#8a5a24", grid: "#8a6a35", ink: "#5b3d1c", coordinate: "#7c5a30" },
  green: { paper: ["#2f9a5a", "#16663a"], frame: "#0c3d22", grid: "#0b2a18", ink: "#0b2a18", coordinate: "#2f6b45" },
  blue: { paper: ["#3a7fc4", "#1d4f86"], frame: "#0f2c4d", grid: "#0c2139", ink: "#0c2139", coordinate: "#2d5a8a" },
  red: { paper: ["#c0473f", "#862722"], frame: "#4a1210", grid: "#360c0a", ink: "#360c0a", coordinate: "#8a3a33" },
  black: { paper: ["#3a3d42", "#1d1f22"], frame: "#0b0c0e", grid: "#6d737c", ink: "#9aa0a8", coordinate: "#565b63" },
};

/** A board as asked: a ready-made one by name, or a look of your own. */
export function tsunagiBoardLook(board: TsunagiBoardName | TsunagiBoardLook | undefined): TsunagiBoardLook {
  if (board === undefined) return TSUNAGI_BOARDS[TSUNAGI_DEFAULT_BOARD];
  if (typeof board === "string") return TSUNAGI_BOARDS[board] ?? TSUNAGI_BOARDS[TSUNAGI_DEFAULT_BOARD];
  return board;
}
