/**
 * PORTALS: a pair of cells inside the board, and a line that goes into one
 * comes out of the other the same way on. What is held here: the code, the
 * steps, the solver and the check against a plain search, what a finger does,
 * the drawing, and the boards the generator makes.
 */

/** A board of `size` with these stones (a pair's letter to its two cells) and portals, as a code. */
export function codeOf(size: number, stones: Record<string, [number, number]>, portals: string, tail = ""): string {
  const cells = new Array<string>(size * size).fill(".");
  for (const [letter, [a, b]] of Object.entries(stones)) {
    cells[a] = letter;
    cells[b] = letter;
  }
  return `${cells.join("")}|portals${portals}${tail}`;
}

/**
 * The 6×6 board most of this uses: A from cell 12 (row 3, column 1) to cell 35
 * (the bottom right corner), and a portal between cells 14 (row 3, column 3)
 * and 28 (row 5, column 5), two rows and two columns apart. A line going right
 * into 14 comes out of 28 going right, into 29.
 */
export const SIX = codeOf(6, { A: [12, 35] }, "14-28");
