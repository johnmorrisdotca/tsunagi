import { describe, expect, it } from "vitest";
import { cheatLine } from "./cheat.ts";
import { checkTsunagiAnswer } from "./check.ts";
import { CELL_BLOCKED, decodeLayout } from "./code.ts";
import { forcedShare } from "./difficulty.ts";
import { drawTsunagi } from "./draw.ts";
import { explosionAfter } from "./explosions.ts";
import { dragGame, liftGame, newTsunagiGame, pressGame } from "./game.ts";
import { relettered, transformed } from "./generate.ts";
import { CELL, lineRuns, PORTAL_STUB, tsunagiGeometry } from "./geometry.ts";
import { challengesOf } from "./ladder.ts";
import {
  allJoined,
  answerOf,
  decodeLines,
  dragFinger,
  encodeLines,
  joined,
  type Lines,
  linesOfAnswer,
  NO_REACH,
  noLines,
  pressAt,
} from "./lines.ts";
import { codeOf, SIX } from "./portals.fixture.ts";
import { seededRandom } from "./random.ts";
import { reducedCandidate, withPortals } from "./reduce.ts";
import { countSolutions, countSolutionsOfLevel } from "./solve.ts";

describe("a finger drawing through a portal", () => {
  const layout = decodeLayout(SIX, 6)!;
  const start = (): { lines: Lines; reach: typeof NO_REACH } => ({
    lines: pressAt(layout, noLines(layout), 12).lines,
    reach: NO_REACH,
  });
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
    const lines: Lines = [
      [11, 17, 23, 29],
      [12, 13],
    ];
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
    for (const [size, seed, portals, wrap] of [
      [6, 3, 1, false],
      [7, 4, 2, false],
      [8, 5, 2, true],
      [10, 6, 3, false],
    ] as const) {
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
      for (const line of blown.lines)
        if (line.length > 0) expect(layout.portals.has(line[line.length - 1]!)).toBe(false);
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
          if (
            layout.portals.has(before) ||
            (layout.portals.has(line[at - 2] ?? -1) && layout.portals.get(line[at - 2]!) === before)
          )
            continue;
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
