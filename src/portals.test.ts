import { describe, expect, it } from "vitest";

import { checkTsunagiAnswer } from "./check.ts";
import { cheatLine } from "./cheat.ts";
import { CELL_BLOCKED, CELL_EMPTY, decodeLayout, encodeAnswer, encodeLayout, portalExit, type LinkLayout } from "./code.ts";
import { forcedShare } from "./difficulty.ts";
import { drawTsunagi } from "./draw.ts";
import { explosionAfter } from "./explosions.ts";
import { CELL, lineRuns, PORTAL_STUB, tsunagiGeometry } from "./geometry.ts";
import { dragGame, liftGame, newTsunagiGame, pressGame } from "./game.ts";
import { relettered, symmetryKey, transformed } from "./generate.ts";
import { challengesOf } from "./ladder.ts";
import { allJoined, answerOf, decodeLines, dragFinger, encodeLines, joined, linesOfAnswer, NO_REACH, noLines, pressAt, type Lines } from "./lines.ts";
import { seededRandom } from "./random.ts";
import { reducedCandidate, withPortals } from "./reduce.ts";
import { countSolutions, countSolutionsOfLevel } from "./solve.ts";
import { countSolutionsSat } from "./solveSat.ts";
import { stepTable } from "./steps.ts";

/**
 * PORTALS: a pair of cells inside the board, and a line that goes into one
 * comes out of the other the same way on. What is held here: the code, the
 * steps, the solver and the check against a plain search, what a finger does,
 * the drawing, and the boards the generator makes.
 */

/** A board of `size` with these stones (a pair's letter to its two cells) and portals, as a code. */
function codeOf(size: number, stones: Record<string, [number, number]>, portals: string, tail = ""): string {
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
const SIX = codeOf(6, { A: [12, 35] }, "14-28");

describe("portals in a layout's code", () => {
  it("are read after the cells, each as its two cells, the smaller first", () => {
    const layout = decodeLayout(SIX, 6)!;
    expect(layout.portalPairs).toEqual([[14, 28]]);
    expect([...layout.portals]).toEqual([[14, 28], [28, 14]]);
    expect(layout.cells[14]).toBe(CELL_EMPTY);
    expect(layout.cells[28]).toBe(CELL_EMPTY);
  });

  it("are written back as they were read, in the place the tail has them", () => {
    const code = codeOf(6, { A: [12, 35] }, "14-28", "|boom3");
    const cells = decodeLayout(code, 6)!.cells;
    expect(encodeLayout(cells, [], { portals: [[28, 14]], explosions: { every: 3, blast: false } })).toBe(code);
    const wrapped = SIX.replace("|portals", "|wrap|portals");
    expect(decodeLayout(wrapped, 6)!.wrap).toBe(true);
    expect(decodeLayout(`${wrapped}|strokes4`, 6)!.strokes).toBe(4);
    // Out of its place in the tail, or twice, is no layout.
    expect(decodeLayout(`${SIX}|wrap`, 6)).toBeNull();
    expect(decodeLayout(`${SIX}|${SIX.split("|")[1]}`, 6)).toBeNull();
  });

  it("turn with the board: the same board turned or mirrored is the same board", () => {
    const keys = new Set<string>();
    for (let turn = 0; turn < 4; turn += 1) {
      for (const mirror of [false, true]) {
        const moved = transformed(SIX, 6, turn, mirror);
        const layout = decodeLayout(moved, 6);
        expect(layout, `${turn} ${mirror}`).not.toBeNull();
        expect(layout!.portalPairs).toHaveLength(1);
        keys.add(symmetryKey(moved, 6));
      }
    }
    expect(keys.size).toBe(1);
  });

  it("are refused when they are not a board's portals", () => {
    const refused = (portals: string, stones: Record<string, [number, number]> = { A: [12, 35] }) => decodeLayout(codeOf(6, stones, portals), 6);
    // Out of order, the larger cell first, one cell twice, a cell off the board, a list that is not one.
    expect(refused("14-28,2-9")).toBeNull();
    expect(refused("28-14")).toBeNull();
    expect(refused("14-14")).toBeNull();
    expect(refused("14-28,14-30")).toBeNull();
    expect(refused("14-99")).toBeNull();
    expect(refused("14-28,")).toBeNull();
    // Side by side, or a portal beside another pair's.
    expect(refused("14-15")).toBeNull();
    expect(refused("14-28,15-33")).toBeNull();
    // A stone on a portal.
    expect(refused("12-28")).toBeNull();
    // A hexagon, or a board with a bridge, has none.
    const grid = SIX.split("|")[0]!;
    expect(decodeLayout(`${grid}|hex|portals14-28`, 6)).toBeNull();
    const bridged = grid.split("");
    bridged[8] = "+";
    expect(decodeLayout(`${bridged.join("")}|portals14-28`, 6)).toBeNull();
    // A blocked cell, or a waypoint, is no portal.
    const blocked = grid.split("");
    blocked[14] = "#";
    expect(decodeLayout(`${blocked.join("")}|portals14-28`, 6)).toBeNull();
    const marked = grid.split("");
    marked[14] = "a";
    expect(decodeLayout(`${marked.join("")}|portals14-28`, 6)).toBeNull();
  });

  it("are refused where an answer's cells could not tell two ways for a line apart", () => {
    // Cells 14 and 27 are a knight's move apart: going down into 27 from 21 comes out of 14 at 20, beside 21 already.
    expect(decodeLayout(codeOf(6, { A: [12, 35] }, "14-27"), 6)).toBeNull();
    // Two portals that join the same two cells (14 and 35, by 15 and 34 and by 20 and 29) are two ways too.
    expect(decodeLayout(codeOf(6, { A: [0, 11] }, "15-34,20-29"), 6)).toBeNull();
    expect(decodeLayout(codeOf(6, { A: [0, 11] }, "15-34,19-29"), 6)).not.toBeNull();
  });

  it("send a line out the same way it went in, round a board that wraps too", () => {
    const layout = decodeLayout(SIX, 6)!;
    expect(portalExit(layout, 13, 14)).toBe(29);
    expect(portalExit(layout, 15, 14)).toBe(27);
    expect(portalExit(layout, 8, 14)).toBe(34);
    expect(portalExit(layout, 20, 14)).toBe(22);
    expect(portalExit(layout, 29, 28)).toBe(13);
    // Off the board where there is no cell beyond: into 28 from 34 going up comes out of 14 at 8; into 14 from 8 comes out of 28 at 34; and 28's right is 29, whose right is off.
    const wrapped = decodeLayout(SIX.replace("|portals", "|wrap|portals"), 6)!;
    expect(portalExit(wrapped, 29, 28)).toBe(13);
    const edge = decodeLayout(codeOf(6, { A: [0, 35] }, "10-29"), 6)!;
    // 10 is at the right of row 2... 29 is at the right of row 5: nothing beyond it going right.
    expect(portalExit(edge, 9, 10)).toBe(-1);
    expect(portalExit(decodeLayout(codeOf(6, { A: [0, 35] }, "10-29").replace("|portals", "|wrap|portals"), 6)!, 9, 10)).toBe(24);
  });
});

describe("the steps through a portal", () => {
  const layout = decodeLayout(SIX, 6)!;
  const steps = stepTable(layout);

  it("go in at one cell and out of the other the same way on, taking both cells", () => {
    expect(steps[13]!.find((step) => step.through.length > 0)).toMatchObject({ to: 29, through: [14, 28] });
    expect(steps[29]!.find((step) => step.through.length > 0)).toMatchObject({ to: 13, through: [28, 14] });
    expect(steps[8]!.find((step) => step.through.length > 0)).toMatchObject({ to: 34, through: [14, 28] });
  });

  it("leave a portal cell with none of its own, and never stop on one", () => {
    expect(steps[14]).toEqual([]);
    expect(steps[28]).toEqual([]);
    for (const around of steps) for (const step of around) expect(layout.portals.has(step.to)).toBe(false);
  });

  it("are no step where the way out is off the board or across a wall", () => {
    // Out of 28 going right is 29, and the wall between 28 and 29 closes the way into 14 from 13.
    const walled = decodeLayout(SIX.replace("|portals", "|28-29|portals"), 6)!;
    expect(stepTable(walled)[13]!.filter((step) => step.through.length > 0)).toEqual([]);
    // The right column has nothing beyond it.
    const edge = decodeLayout(codeOf(6, { A: [0, 35] }, "10-29"), 6)!;
    expect(stepTable(edge)[9]!.filter((step) => step.through.length > 0)).toEqual([]);
  });
});

describe("the solver and the check, against a plain search", () => {
  /** Every filling of a layout, by trying each pair's every line in turn: the plain way to count answers, and which of them keep every line clean. */
  function brute(layout: LinkLayout): { answers: string[]; clean: boolean[] } {
    const { size, cells, ends } = layout;
    const total = size * size;
    const steps = stepTable(layout);
    const owner = new Array<number>(total).fill(-1);
    cells.forEach((cell, at) => {
      if (cell === CELL_BLOCKED) owner[at] = -2;
    });
    for (const [pair, [a, b]] of ends.entries()) {
      owner[a] = pair;
      owner[b] = pair;
    }
    const answers: string[] = [];
    const clean: boolean[] = [];
    const sequence: number[][] = ends.map(() => []);
    const go = (pair: number, at: number): void => {
      if (pair === ends.length) {
        if (!owner.every((each) => each !== -1)) return;
        answers.push(encodeAnswer(owner));
        // Clean: no two cells of a line are a step apart unless they are next to each other in it.
        clean.push(
          sequence.every((line, each) =>
            line.every((cell, index) =>
              steps[cell]!.every((step) => {
                if (owner[step.to] !== each || !step.through.every((through) => owner[through] === each)) return true;
                const far = line.indexOf(step.to);
                return far === index + 1 + step.through.length || far === index - 1 - step.through.length;
              }),
            ),
          ),
        );
        return;
      }
      if (at === ends[pair]![1]) return go(pair + 1, ends[pair + 1]?.[0] ?? 0);
      for (const step of steps[at]!) {
        const target = step.to === ends[pair]![1];
        if (!(target || owner[step.to] === -1) || !step.through.every((cell) => owner[cell] === -1)) continue;
        const taken = [...step.through, ...(target ? [] : [step.to])];
        for (const cell of taken) owner[cell] = pair;
        const length = sequence[pair]!.length;
        if (length === 0) sequence[pair]!.push(ends[pair]![0]);
        const now = sequence[pair]!.length;
        sequence[pair]!.push(...step.through, step.to);
        go(pair, step.to);
        sequence[pair]!.length = now;
        if (length === 0) sequence[pair]!.length = 0;
        for (const cell of taken) owner[cell] = -1;
      }
    };
    if (ends.length > 0) go(0, ends[0]![0]);
    return { answers, clean };
  }

  it("count the answers of a few hundred small boards as the plain search does, in both ways of writing the pairs, and check every clean one", () => {
    const random = seededRandom(7);
    let tested = 0;
    let solvable = 0;
    for (let attempt = 0; attempt < 2500; attempt += 1) {
      const size = 4 + Math.floor(random() * 2);
      const total = size * size;
      const picks = [...Array(total).keys()].sort(() => random() - 0.5);
      const pairs = 2 + Math.floor(random() * 3);
      const stones = picks.slice(0, pairs * 2).sort((a, b) => a - b);
      const portalCount = 1 + Math.floor(random() * 2);
      const portalCells = picks.slice(pairs * 2, pairs * 2 + portalCount * 2);
      const cells = new Array<number>(total).fill(CELL_EMPTY);
      const shuffled = [...stones].sort(() => random() - 0.5);
      const pairOf = new Map<number, number>(shuffled.map((cell, index) => [cell, Math.floor(index / 2)]));
      const order: number[] = [];
      for (const cell of stones) if (!order.includes(pairOf.get(cell)!)) order.push(pairOf.get(cell)!);
      for (const cell of stones) cells[cell] = order.indexOf(pairOf.get(cell)!);
      const code = encodeLayout(cells, [], { wrap: random() < 0.3, portals: Array.from({ length: portalCount }, (_, each) => [portalCells[2 * each]!, portalCells[2 * each + 1]!] as const) });
      const layout = decodeLayout(code, size);
      if (layout === null) continue;
      tested += 1;
      const plain = brute(layout);
      const counted = countSolutionsSat(layout, 50, Number.POSITIVE_INFINITY, null, tested % 2 === 0 ? "one-hot" : "binary");
      expect(counted.count, code).toBe(Math.min(plain.answers.length, 50));
      if (plain.answers.length <= 50) expect(new Set(counted.solutions.map(encodeAnswer))).toEqual(new Set(plain.answers));
      if (plain.answers.length > 0) solvable += 1;
      plain.answers.forEach((answer, index) => {
        const verdict = checkTsunagiAnswer(size, code, answer);
        // A line that runs beside itself is refused on any board; a clean one is taken.
        if (plain.clean[index]) expect(verdict, `${code} ${answer}`).toEqual({ ok: true });
        else expect(verdict.ok).toBe(false);
      });
      // A forgery, two cells of an answer swapped, is taken only if it is another answer.
      for (let each = 0; each < 10 && plain.answers.length > 0; each += 1) {
        const arr = [...plain.answers[Math.floor(random() * plain.answers.length)]!];
        const [i, j] = [Math.floor(random() * arr.length), Math.floor(random() * arr.length)];
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
        const forged = arr.join("");
        if (checkTsunagiAnswer(size, code, forged).ok) expect(plain.answers).toContain(forged);
      }
    }
    expect(tested).toBeGreaterThan(80);
    expect(solvable).toBeGreaterThan(8);
  });

  it("count a board with portals by SAT, whatever its size", () => {
    const layout = decodeLayout(SIX, 6)!;
    // One pair on a board of thirty-four more cells has no answer; the count says so without a search of positions.
    expect(countSolutions(layout, 2, 50_000).count).toBe(0);
  });
});

describe("a finger drawing through a portal", () => {
  const layout = decodeLayout(SIX, 6)!;
  const start = (): { lines: Lines; reach: typeof NO_REACH } => ({ lines: pressAt(layout, noLines(layout), 12).lines, reach: NO_REACH });
  /** The finger over each of these cells in turn. */
  const along = (cells: number[]): { lines: Lines; reach: typeof NO_REACH } => {
    let state = start();
    for (const finger of cells) state = dragFinger(layout, state.lines, 0, finger, state.reach);
    return state;
  };

  it("goes in at one ring and out of the other in the one drag, and goes on from there with the finger", () => {
    const into = along([13, 14]);
    // In at 14, out of 28, on into 29: never resting inside a portal.
    expect(into.lines[0]).toEqual([12, 13, 14, 28, 29]);
    // The finger is over 14 and the line's end is at 29: two rows and three columns apart.
    expect(into.reach).toEqual({ dr: 2, dc: 3 });
    // The finger moves a cell down, from 14 to 20, and the line one cell down from 29, to 35, its own far stone.
    const done = dragFinger(layout, into.lines, 0, 20, into.reach);
    expect(done.lines[0]).toEqual([12, 13, 14, 28, 29, 35]);
    expect(joined(layout, done.lines, 0)).toBe(true);
  });

  it("is taken back over a portal as it went in, and the finger is over the line's end again", () => {
    const state = along([13, 14, 20]);
    const back = dragFinger(layout, state.lines, 0, 14, state.reach);
    expect(back.lines[0]).toEqual([12, 13, 14, 28, 29]);
    const further = dragFinger(layout, back.lines, 0, 13, back.reach);
    // Back over the portal itself: the line is as it was before it, and the finger over its end.
    expect(further.lines[0]).toEqual([12, 13]);
    expect(further.reach).toEqual({ dr: 0, dc: 0 });
  });

  it("is taken back to before a portal when it is pressed on one of its cells, never left inside it", () => {
    const state = along([13, 14, 20]);
    for (const cell of [14, 28]) {
      const pressed = pressAt(layout, state.lines, cell);
      expect(pressed.lines[0]).toEqual([12, 13]);
      expect(pressed.drawing).toBe(0);
    }
    // Pressed on the cell beyond it, the line keeps the portal.
    expect(pressAt(layout, state.lines, 29).lines[0]).toEqual([12, 13, 14, 28, 29]);
  });

  it("does not go in where the way out is no way: a blocked cell, another pair's stone, or a cell it has", () => {
    const blocked = decodeLayout(SIX.replace(/^(.{29})\./, "$1#"), 6)!;
    expect(blocked.cells[29]).toBe(CELL_BLOCKED);
    let started = pressAt(blocked, noLines(blocked), 12).lines;
    started = dragFinger(blocked, started, 0, 13, NO_REACH).lines;
    expect(dragFinger(blocked, started, 0, 14, NO_REACH).lines).toBe(started);
    const stone = decodeLayout(codeOf(6, { A: [12, 35], B: [29, 33] }, "14-28"), 6)!;
    let again = pressAt(stone, noLines(stone), 12).lines;
    again = dragFinger(stone, again, 0, 13, NO_REACH).lines;
    expect(dragFinger(stone, again, 0, 14, NO_REACH).lines).toBe(again);
  });

  it("cuts another line back to before the cell it comes out at when it goes through", () => {
    // A is a line down the right-hand column that holds 29, the cell the portal comes out into; B is drawn from 12.
    const two = decodeLayout(codeOf(6, { A: [11, 34], B: [12, 35] }, "14-28"), 6)!;
    const lines: Lines = [[11, 17, 23, 29], [12, 13]];
    const dragged = dragFinger(two, lines, 1, 14, NO_REACH).lines;
    expect(dragged[1]).toEqual([12, 13, 14, 28, 29]);
    expect(dragged[0]).toEqual([11, 17, 23]);
  });

  it("is kept as a progress code and read back the same", () => {
    const whole: Lines = [[12, 13, 14, 28, 29, 35]];
    const code = encodeLines(layout, whole);
    expect(code[28]).toBe("p");
    expect(code[14]).toBe("w");
    expect(code[29]).toBe("w");
    expect(decodeLines(layout, code)).toEqual(whole);
    // A portal's second cell whose first has no line is no progress.
    const broken = [...code];
    broken[14] = ".";
    expect(decodeLines(layout, broken.join(""))).toBeNull();
  });
});

describe("boards made with portals", () => {
  const made = (size: number, seed: number, portals: number, extra: { wrap?: boolean } = {}) => {
    const random = seededRandom(seed);
    for (let tries = 0; tries < 80; tries += 1) {
      const board = reducedCandidate(size, random, { portals, budget: 4000, ...extra });
      if (board !== null) return board;
    }
    throw new Error(`no ${size}×${size} board with ${portals} portals`);
  };

  it("have exactly one answer, which the check takes and the lines draw, with every portal on one line", () => {
    for (const [size, seed, portals, wrap] of [[6, 3, 1, false], [7, 4, 2, false], [8, 5, 2, true], [10, 6, 3, false]] as const) {
      const board = made(size, seed, portals, { wrap });
      const layout = decodeLayout(board.layout, size)!;
      expect(layout.portalPairs).toHaveLength(portals);
      expect(challengesOf(board.layout)).toContain("portals");
      expect(countSolutions(layout, 2).count, board.layout).toBe(1);
      expect(countSolutionsOfLevel(layout, board.answer).count).toBe(1);
      expect(checkTsunagiAnswer(size, board.layout, board.answer)).toEqual({ ok: true });
      const drawn = linesOfAnswer(layout, board.answer)!;
      expect(drawn).not.toBeNull();
      expect(allJoined(layout, drawn)).toBe(true);
      expect(answerOf(layout, drawn)).toBe(board.answer);
      for (const [a, b] of layout.portalPairs) {
        const through = drawn.filter((line) => line.includes(a) && line.includes(b));
        expect(through).toHaveLength(1);
        expect(Math.abs(through[0]!.indexOf(a) - through[0]!.indexOf(b))).toBe(1);
      }
      expect(Number.isFinite(forcedShare(board.layout, size))).toBe(true);
    }
  });

  it("are the same board however it is turned, and have one answer each way", () => {
    const board = made(7, 4, 2);
    for (let turn = 0; turn < 4; turn += 1) {
      for (const mirror of [false, true]) {
        const layout = decodeLayout(relettered(transformed(board.layout, 7, turn, mirror)), 7)!;
        expect(countSolutions(layout, 2).count, `${turn} ${mirror}`).toBe(1);
      }
    }
  });

  it("are made by joining lines of a filling: every cell kept, every line clean", () => {
    const random = seededRandom(9);
    // Six rows of six: a filling by rows, whose lines run beside each other but never along themselves.
    const rows = Array.from({ length: 6 }, (_, row) => Array.from({ length: 6 }, (_, col) => row * 6 + col));
    const joinedRows = withPortals(6, rows, random, 1, false);
    expect(joinedRows).not.toBeNull();
    expect(joinedRows!.pairs).toHaveLength(1);
    expect(joinedRows!.paths.flat().sort((a, b) => a - b)).toEqual([...Array(36).keys()]);
  });

  it("are left whole by an explosion that cuts a line, and by the Cheat that draws one", () => {
    const board = made(7, 4, 2);
    const layout = decodeLayout(board.layout, 7)!;
    const drawn = linesOfAnswer(layout, board.answer)!;
    const exploding = { ...layout, explosions: { every: 1, blast: false } };
    for (let stroke = 1; stroke <= 8; stroke += 1) {
      const blown = explosionAfter(exploding, board.layout, drawn, stroke);
      if (blown === null) continue;
      // No line is left ending on a portal.
      for (const line of blown.lines) if (line.length > 0) expect(layout.portals.has(line[line.length - 1]!)).toBe(false);
    }
    const cheated = cheatLine(layout, noLines(layout), drawn)!;
    expect(cheated.lines[cheated.pair]).toEqual(drawn[cheated.pair]);
  });

  it("are solved by a finger that draws each line a step at a time, through its portals, lifting and taking up the line's end where the finger would leave the board", () => {
    // The finger moves as the line moves, a step for a step, and a passage through a portal is the one step into its first ring: the line comes out of the second by itself, and the finger is left where it went in.
    let lifts = 0;
    for (const seed of [4, 11, 12, 13]) {
      const board = made(7, seed, 1);
      const layout = decodeLayout(board.layout, 7)!;
      const drawn = linesOfAnswer(layout, board.answer)!;
      let game = newTsunagiGame(board.layout, 7, { answer: board.answer })!;
      for (const line of drawn) {
        let row = Math.floor(line[0]! / 7);
        let col = line[0]! % 7;
        game = pressGame(game, line[0]!);
        for (let at = 1; at < line.length; at += 1) {
          const [before, cell] = [line[at - 1]!, line[at]!];
          // The line comes out of the second ring and on into the cell beyond it by itself: neither is a step of the finger's.
          if (layout.portals.has(before) || layout.portals.has(line[at - 2] ?? -1) && layout.portals.get(line[at - 2]!) === before) continue;
          const [dr, dc] = [Math.floor(cell / 7) - Math.floor(before / 7), (cell % 7) - (before % 7)];
          if (row + dr < 0 || row + dr >= 7 || col + dc < 0 || col + dc >= 7) {
            // Off the board: let go, and take the line up again by its end, where it is.
            game = liftGame(game);
            lifts += 1;
            game = pressGame(game, before);
            row = Math.floor(before / 7);
            col = before % 7;
          }
          row += dr;
          col += dc;
          game = dragGame(game, row * 7 + col);
        }
        game = liftGame(game);
      }
      expect(game.lines, `seed ${seed}`).toEqual(drawn);
      expect(game.solved, `seed ${seed}`).toBe(true);
    }
    expect(lifts).toBeGreaterThanOrEqual(0);
  });
});

describe("portals drawn", () => {
  const layout = decodeLayout(SIX, 6)!;
  const through: Lines = [[12, 13, 14, 28, 29, 35]];

  it("are two rings alike with a faint link, a line stopping just inside the ring it goes into and starting just inside the other", () => {
    const svg = drawTsunagi(layout, { lines: through });
    expect(svg.match(/class="tsu-portal"/g)).toHaveLength(1);
    expect(svg.match(/class="tsu-portal-end"/g)).toHaveLength(2);
    expect(svg).toContain("tsu-portal-link");
    expect(svg).toContain('aria-label="portal α, between row 3, column 3 and row 5, column 5"');
    const geometry = tsunagiGeometry(layout);
    const runs = lineRuns(layout, geometry, through[0]!);
    expect(runs).toHaveLength(2);
    const into = geometry.centre(14);
    const last = runs[0]![runs[0]!.length - 1]!;
    expect(Math.hypot(last.x - into.x, last.y - into.y)).toBeCloseTo(PORTAL_STUB * CELL, 5);
    // On the side it came in by: left of the ring.
    expect(last.x).toBeLessThan(into.x);
    const out = geometry.centre(28);
    const first = runs[1]![0]!;
    expect(Math.hypot(first.x - out.x, first.y - out.y)).toBeCloseTo(PORTAL_STUB * CELL, 5);
    // And it goes on to the right, the way it went in.
    expect(first.x).toBeGreaterThan(out.x);
    expect(runs[1]![1]).toEqual(geometry.centre(29));
  });

  it("have no bead on a ring, and no ring where there are no portals", () => {
    const svg = drawTsunagi(layout, { lines: through });
    expect(svg).toContain('class="tsu-bead" data-pair="0" data-cell="13"');
    expect(svg).not.toContain('class="tsu-bead" data-pair="0" data-cell="14"');
    expect(svg).not.toContain('class="tsu-bead" data-pair="0" data-cell="28"');
    expect(drawTsunagi(decodeLayout(SIX.split("|")[0]!, 6)!)).not.toContain("tsu-portal");
  });

  it("are a challenge of the level, counted after wrap", () => {
    expect(challengesOf(SIX)).toEqual(["portals"]);
    expect(challengesOf(`${SIX.split("|")[0]}|wrap|portals14-28|boom3`)).toEqual(["wrap", "portals", "explosions"]);
  });
});
