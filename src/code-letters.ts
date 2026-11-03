/**
 * TSUNAGI, WRITTEN DOWN: a level's layout and a finished grid, as the
 * strings every puzzle travels as (`puzzleCode.ts` is the spelling of the
 * number grids; this is the spelling of this one).
 *
 * A LAYOUT is row-major, one character a cell: `.` for an empty cell, a
 * capital letter for a stone (`PAIR_LETTERS`: after Z the digits, then small
 * letters and some marks, for a board of dozens of pairs) — each letter exactly
 * twice, the two ends of one line — `#` for a blocked cell no line may enter, and `+` for a BRIDGE: a cell
 * two different lines cross, one straight across and one straight down, neither
 * turning on it (John, 2026-09-26; Flow Free's bridges). The letters are named
 * in the order their first stone is met reading left to right, top to bottom,
 * so one layout has one spelling.
 *
 * WALLS come after the cells, behind a `|`: the edges between two neighbouring
 * cells no line may cross, each as its two cells `a-b` (a before b), in order,
 * comma-separated — `A..A|1-2,5-9`. A layout with no walls has no `|`, so every
 * layout written before walls existed is still the same string, and the same
 * board (solves are kept by it).
 *
 * A bridge sits away from the edge, never beside another bridge, and no wall
 * touches it: it always has its four ways across.
 *
 * A WAYPOINT is a pair's letter in lower case on an empty cell: a ring of that
 * colour its line must pass through (John, 2026-09-26). WRAP comes last, as the
 * segment `wrap` after the walls (or after the cells where there are none): the
 * left and right edges join, and so do the top and bottom, so a line leaving
 * one side comes back in on the other, as the wrapping gomoku does.
 *
 * A HEXAGON (`hex`, first of the words after the walls) is Hexversi's
 * honeycomb: an odd square of side 2R + 1 with every row slid half a cell
 * along, so each cell has six neighbours — the four around it and the two
 * diagonals along the slant, up-right and down-left (`rules/hexagon.ts`). The
 * cells outside the hexagon of radius R are `#`, off the board, and a
 * hexagon has no walls, bridges or wrap.
 *
 * PORTALS (`portals<a>-<b>,…`, after `wrap`) are pairs of cells inside the board,
 * each named by its two cells, the smaller first, the pairs by their smaller cell:
 * a line that steps into one comes out of the other, going on the same way, so
 * `portals3-40` makes a line stepping right into cell 3 reappear moving right out
 * of cell 40, in the cell beyond it. Both cells of a portal are on that line, and a
 * portal is used by exactly one line, once, so the cells are filled like any other.
 * A portal is an empty cell: never a stone, a waypoint, a bridge or blocked, never
 * beside another portal, and a board with portals has no bridges and is no hexagon.
 *
 * A SHAPE (`shape`, after `hex`) says the board is not the whole of its square: every
 * `#` that reaches the square's edge through other `#` cells is off the board, not
 * drawn and not a cell at all, and a `#` inside is still a blocked cell. So a board of
 * 9 by 13 is a square of side 13 with its last four columns off, and a hexagon a few
 * rows taller than it is wide is a `hex` with `shape`; nothing that reads a board has
 * to know the square was ever bigger, and no code written before shapes changes.
 *
 * `sparse` says the board has few, long lines — at most `sparseMost` — and is
 * refused on a board with more; `strokes<N>` (last of all) gives the player N
 * strokes to solve it in, every lift that changed the board spending one.
 *
 * AN ANSWER is the grid of cells with every open cell carrying the letter of
 * the line through it, `#` where the layout has one, and `+` on a bridge: the
 * two lines over it are the ones either side of it.
 *
 * Imports carry their `.ts` so the level script (`scripts/tsunagi-levels.ts`)
 * can run this under plain node.
 *
 * @example
 * ```ts
 * import { LINK_EMPTY } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_EMPTY);
 * ```
 */

export const LINK_EMPTY = ".";
/** The blocked-cell marker in a layout code.
 *
 * @example
 * ```ts
 * import { LINK_BLOCKED } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_BLOCKED);
 * ```
 */
export const LINK_BLOCKED = "#";
/** The bridge-cell marker in a layout code.
 *
 * @example
 * ```ts
 * import { LINK_BRIDGE } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_BRIDGE);
 * ```
 */
export const LINK_BRIDGE = "+";
/** Where the walls start, after the cells.
 *
 * @example
 * ```ts
 * import { LINK_WALLS } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_WALLS);
 * ```
 */
export const LINK_WALLS = "|";

/**
 * The characters a pair may be named by, in order: the capital letters, the
 * digits, the small letters, then twenty punctuation marks, eighty-two in all,
 * enough for a 30×30 board with as many lines to the cell as a 15×15 has. A
 * layout written when the list was shorter (A to P) is still the same string.
 *
 * A small letter is two things in a layout: a waypoint of the capital it is
 * the lower case of, or, on a board that uses every capital and digit, one of
 * the pairs after them. The board says which by what it uses (`stoneLetters`):
 * a board of thirty-six pairs or more has no waypoints.
 *
 * @example
 * ```ts
 * import { PAIR_LETTERS } from "@johnmorrisdotca/tsunagi";
 * console.log(PAIR_LETTERS);
 * ```
 */
export const PAIR_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@$%*()[]{},:;=?^_~/";

/** The waypoints a layout may carry: a pair's capital in lower case, so only the first twenty-six pairs can have one.
 *
 * @example
 * ```ts
 * import { WAYPOINT_LETTERS } from "@johnmorrisdotca/tsunagi";
 * console.log(WAYPOINT_LETTERS);
 * ```
 */
export const WAYPOINT_LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** How many of `PAIR_LETTERS` are not small letters: a board that uses all of them has small letters for stones.
 *
 * @example
 * ```ts
 * import { CAPITAL_PAIRS } from "@johnmorrisdotca/tsunagi";
 * console.log(CAPITAL_PAIRS);
 * ```
 */
export const CAPITAL_PAIRS = 36;

/** The characters that name pairs in a layout's cells: the first thirty-six (capitals and digits), or all eighty-two where the board uses every one of the thirty-six, which is when its small letters are stones and not waypoints.
 *
 * @param cells - The row-major decoded cell values.
 * @returns The characters that name pairs in a layout's cells: the first thirty-six (capitals and digits), or all eighty-two where the board uses every one of the thirty-six, which is when its small letters are stones and not waypoints.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { stoneLetters } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * console.log(stoneLetters(givens));
 * ```
 */
export function stoneLetters(cells: string): string {
  const used = new Set<string>();
  for (const char of cells) {
    if (PAIR_LETTERS.indexOf(char) !== -1 && PAIR_LETTERS.indexOf(char) < CAPITAL_PAIRS) used.add(char);
    if (used.size === CAPITAL_PAIRS) return PAIR_LETTERS;
  }
  return PAIR_LETTERS.slice(0, CAPITAL_PAIRS);
}

/** A cell in a decoded layout: an empty cell, a blocked one, or a stone of pair `n` (0 for A).
 *
 * @example
 * ```ts
 * import { CELL_EMPTY } from "@johnmorrisdotca/tsunagi";
 * console.log(CELL_EMPTY);
 * ```
 */
export const CELL_EMPTY = -1;
/** The decoded blocked-cell sentinel.
 *
 * @example
 * ```ts
 * import { CELL_BLOCKED } from "@johnmorrisdotca/tsunagi";
 * console.log(CELL_BLOCKED);
 * ```
 */
export const CELL_BLOCKED = -2;
/** The decoded bridge-cell sentinel.
 *
 * @example
 * ```ts
 * import { CELL_BRIDGE } from "@johnmorrisdotca/tsunagi";
 * console.log(CELL_BRIDGE);
 * ```
 */
export const CELL_BRIDGE = -3;

/**
 * The words that may follow the cells (and walls), each at most once and in
 * this order, so one board has one spelling: `wrap`, then an explosion —
 * `boom<N>` (a line cut back every N strokes) or `blast<N>` (a line wiped and
 * its neighbour cut).
 */
export const TAIL_ORDER = ["hex", "shape", "sparse", "wrap", "portals", "explosion", "strokes"] as const;

/** Which of the tail's words a segment is, and what it says; null for none of them (the walls list).
 *
 * @param segment - One native layout-code suffix segment.
 * @returns Which of the tail's words a segment is, and what it says; null for none of them (the walls list).
 * @example
 * ```ts
 * import { tailWord } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(tailWord("strokes5"));
 * ```
 */
export function tailWord(
  segment: string,
): { word: (typeof TAIL_ORDER)[number]; every?: number; blast?: boolean; list?: string } | null {
  if (segment === LINK_WRAP) return { word: "wrap" };
  if (segment.startsWith(LINK_PORTALS) && /^portals\d+-\d+(,\d+-\d+)*$/.test(segment))
    return { word: "portals", list: segment.slice(LINK_PORTALS.length) };
  if (segment === LINK_HEX) return { word: "hex" };
  if (segment === LINK_SHAPE) return { word: "shape" };
  if (segment === LINK_SPARSE) return { word: "sparse" };
  const limit = /^strokes([1-9][0-9]?)$/.exec(segment);
  if (limit !== null) return { word: "strokes", every: Number(limit[1]) };
  const boom = /^(boom|blast)([1-9][0-9]?)$/.exec(segment);
  if (boom !== null) return { word: "explosion", every: Number(boom[2]), blast: boom[1] === "blast" };
  return null;
}

/** The segment after the cells that makes a board wrap.
 *
 * @example
 * ```ts
 * import { LINK_WRAP } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_WRAP);
 * ```
 */
export const LINK_WRAP = "wrap";

/** The word after the cells that begins a list of portals, each as its two cells.
 *
 * @example
 * ```ts
 * import { LINK_PORTALS } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_PORTALS);
 * ```
 */
export const LINK_PORTALS = "portals";

/** The segment after the cells that says the `#` cells reaching the square's edge are off the board.
 *
 * @example
 * ```ts
 * import { LINK_SHAPE } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_SHAPE);
 * ```
 */
export const LINK_SHAPE = "shape";

/** The segment after the cells that makes a board a hexagon of hexagons.
 *
 * @example
 * ```ts
 * import { LINK_HEX } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_HEX);
 * ```
 */
export const LINK_HEX = "hex";

/** The segment after the cells that says a board has few, long lines.
 *
 * @example
 * ```ts
 * import { LINK_SPARSE } from "@johnmorrisdotca/tsunagi";
 * console.log(LINK_SPARSE);
 * ```
 */
export const LINK_SPARSE = "sparse";
