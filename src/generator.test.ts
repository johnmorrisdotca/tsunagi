import { describe, expect, it } from "vitest";

import { hexagonBoard, oblongBoard, shapedBoard, squareBoard, type TsunagiBoard, tallHexagonBoard } from "./board.ts";
import { checkTsunagiAnswer } from "./check.ts";
import { CELL_BLOCKED, decodeLayout, encodeAnswer, inHex, layoutCells, onTheBoard } from "./code.ts";
import { drawTsunagi } from "./draw.ts";
import { symmetryKey, transformed } from "./generate.ts";
import { type GeneratorOptions, generateTsunagi, windingLines } from "./generator.ts";
import { cellAtPoint, tsunagiGeometry } from "./geometry.ts";
import { challengesOf } from "./ladder.ts";
import { seededRandom } from "./random.ts";
import { countSolutions, SAT_BINARY_FROM_SIZE, SAT_FROM_SIZE } from "./solve.ts";
import { countSolutionsSat } from "./solveSat.ts";
import { keptView, zoomedAbout } from "./viewport.ts";

/**
 * ONE GENERATOR FOR EVERY BOARD, PROVED. Every board it makes is put through the solver every level is proved by and the
 * check every solve is put through, here as well as inside it, and it has to make one in a browser's time. 13×13 to
 * 15×15 come first, since they are what it was asked for: those were pools run for hours on a desk.
 */
const SEEDS = [11, 23, 37];
/** The slowest a board may take, in a test runner on a busy machine: what John would call a browser's time is well inside it. */
const A_BROWSERS_TIME_MS = 15_000;

function proves(board: TsunagiBoard, options: GeneratorOptions = {}, seeds = SEEDS): number[] {
  return seeds.map((seed) => {
    const began = performance.now();
    const made = generateTsunagi(board, seededRandom(seed), options);
    expect(performance.now() - began).toBeLessThan(A_BROWSERS_TIME_MS);
    expect(made, `seed ${seed} made a board`).not.toBeNull();
    const layout = decodeLayout(made!.layout, board.size);
    expect(layout, "its code reads").not.toBeNull();
    // Proved again here without being told the answer, by the solver that suits the board: a honeycomb's six ways and a big
    // square's four lose the plain search (which runs for hours on them), so those are proved by the one that learns.
    const learns = layout!.hex || board.size >= SAT_FROM_SIZE;
    const solved = learns
      ? countSolutionsSat(layout!, 2, 200_000, null, board.size >= SAT_BINARY_FROM_SIZE ? "binary" : "one-hot")
      : countSolutions(layout!, 2);
    expect(solved.count, "it has exactly one answer").toBe(1);
    expect(encodeAnswer(solved.solution!), "and it is the one it was made from").toBe(made!.answer);
    expect(checkTsunagiAnswer(board.size, made!.layout, made!.answer)).toEqual({ ok: true });
    // Every cell a line may stand on is on a line.
    for (const cell of board.cells) expect("#.".includes(made!.answer[cell]!), `cell ${cell} is on a line`).toBe(false);
    return made!.pairs;
  });
}

describe("the generator at 13×13 to 15×15, where it was asked for first", () => {
  for (const size of [13, 14, 15]) {
    it(`makes a ${size}×${size} board of about a side's worth of lines, proved`, () => {
      for (const pairs of proves(squareBoard(size))) {
        expect(pairs).toBeGreaterThanOrEqual(8);
        expect(pairs).toBeLessThanOrEqual(2 * size);
      }
    });
  }

  it("can hold a 13×13 board to sixteen lines, as the levels are", () => {
    for (const pairs of proves(squareBoard(13), { most: 16 })) expect(pairs).toBeLessThanOrEqual(16);
  });

  it("makes the same board from the same seed, and another from another", () => {
    const one = generateTsunagi(squareBoard(13), seededRandom(5));
    expect(generateTsunagi(squareBoard(13), seededRandom(5))).toEqual(one);
    expect(generateTsunagi(squareBoard(13), seededRandom(6))?.layout).not.toBe(one?.layout);
  });
});

// Each board is proved to have one answer; a CI machine has taken more than the default five seconds over the squares.
describe("the same generator on every other board", { timeout: 60_000 }, () => {
  it("makes every square from 3×3 up", () => {
    for (let size = 3; size <= 12; size += 1) proves(squareBoard(size));
  });

  it("makes boards wider or taller than they are square", () => {
    proves(oblongBoard(3, 5));
    proves(oblongBoard(8, 11));
    proves(oblongBoard(15, 13));
  });

  it("makes hexagons past the three sizes the levels have", () => {
    for (const radius of [2, 3, 4, 5, 6, 7]) proves(hexagonBoard(radius));
  });

  it("makes honeycombs a little taller than they are wide, at many sizes", () => {
    for (const [radius, extra] of [
      [3, 3],
      [4, 4],
      [5, 4],
      [6, 5],
    ] as const) {
      const board = tallHexagonBoard(radius, extra);
      proves(board);
      const { width, height } = tsunagiGeometry(
        decodeLayout(generateTsunagi(board, seededRandom(1))!.layout, board.size)!,
      );
      expect(height / width, `${radius}+${extra} stands a little taller than wide`).toBeGreaterThan(1.05);
      expect(height / width).toBeLessThan(1.5);
    }
  });

  it("makes boards whose edges join", () => {
    proves(squareBoard(7, { wrap: true }));
    proves(squareBoard(13, { wrap: true }));
  });

  it("makes boards of any outline, a hole in one reading as blocked cells", () => {
    const plus = shapedBoard(9, (at) => {
      const [row, col] = [Math.floor(at / 9), at % 9];
      return (row >= 3 && row <= 5) || (col >= 3 && col <= 5);
    });
    proves(plus);
    const ring = shapedBoard(9, (at) => {
      const [row, col] = [Math.floor(at / 9), at % 9];
      return !(row >= 3 && row <= 5 && col >= 3 && col <= 5);
    });
    proves(ring);
    expect(ring.blocked.size).toBe(9);
    const made = generateTsunagi(ring, seededRandom(3))!;
    const layout = decodeLayout(made.layout, 9)!;
    // The hole is blocked cells: on the board, and drawn as such.
    expect(layout.cells[40]).toBe(CELL_BLOCKED);
    expect(onTheBoard(layout, 40)).toBe(true);
  });

  it("plants marked warps", () => {
    proves(squareBoard(7), { warps: 1 });
    proves(squareBoard(10), { warps: 2 });
    proves(squareBoard(13), { warps: 2 });
    proves(oblongBoard(13, 9), { warps: 1 });
    const made = generateTsunagi(squareBoard(15), seededRandom(4), { warps: 3 })!;
    expect(decodeLayout(made.layout, 15)!.portalPairs).toHaveLength(3);
    expect(challengesOf(made.layout)).toContain("portals");
  });

  it("plants bridges", () => {
    proves(squareBoard(6), { bridges: 1 });
    proves(squareBoard(10), { bridges: 2 });
    proves(squareBoard(13), { bridges: 2 });
    proves(oblongBoard(9, 13), { bridges: 1 });
    const made = generateTsunagi(squareBoard(15), seededRandom(4), { bridges: 3 })!;
    expect([...layoutCells(made.layout)].filter((char) => char === "+")).toHaveLength(3);
  });

  it("plants waypoints, on a square and a honeycomb", () => {
    proves(squareBoard(7), { waypoints: 1 });
    proves(squareBoard(13), { waypoints: 3 });
    proves(tallHexagonBoard(5, 4), { waypoints: 2 });
  });

  it("says plainly that a honeycomb has no warps or bridges", () => {
    expect(generateTsunagi(hexagonBoard(3), seededRandom(1), { warps: 1 })).toBeNull();
    expect(generateTsunagi(hexagonBoard(3), seededRandom(1), { bridges: 1 })).toBeNull();
    expect(generateTsunagi(squareBoard(7), seededRandom(1), { bridges: 1, warps: 1 })).toBeNull();
  });
});

describe("one winding path", () => {
  it("goes through every cell of the board once, in lines that never run beside themselves", () => {
    for (const board of [squareBoard(9), hexagonBoard(4), oblongBoard(6, 10), squareBoard(8, { wrap: true })]) {
      const lines = windingLines(board, seededRandom(9), 30)!;
      expect(lines.flat().sort((a, b) => a - b)).toEqual([...board.cells]);
      for (const line of lines) {
        expect(line.length).toBeGreaterThanOrEqual(3);
        line.forEach((cell, at) => {
          for (const next of board.around[cell]!) {
            const where = line.indexOf(next);
            if (where !== -1) expect(Math.abs(where - at)).toBe(1);
          }
        });
      }
    }
  });
});

describe("a board with a shape, written down", () => {
  const made = generateTsunagi(oblongBoard(5, 8), seededRandom(2))!;
  const layout = decodeLayout(made.layout, 8)!;

  it("is a square with what is off it `#`, and says `shape`", () => {
    expect(made.layout.endsWith("|shape")).toBe(true);
    expect(layoutCells(made.layout)).toHaveLength(64);
    expect(layout.off?.size).toBe(64 - 40);
    expect(onTheBoard(layout, 4)).toBe(true);
    expect(onTheBoard(layout, 5)).toBe(false);
  });

  it("does not count what is off it as blocked, and does a hole in it", () => {
    expect(challengesOf(made.layout)).not.toContain("walls");
    const holed = generateTsunagi(squareBoard(7, { blocked: new Set([24]) }), seededRandom(1))!;
    expect(challengesOf(holed.layout)).toContain("walls");
  });

  it("turns and mirrors like any board, keeping its word", () => {
    const turned = transformed(made.layout, 8, 1, false);
    expect(turned.endsWith("|shape")).toBe(true);
    const read = decodeLayout(turned, 8);
    // Its letters are renamed when read in the new reading order, by the one spelling.
    expect(symmetryKey(turned, 8)).toBe(symmetryKey(made.layout, 8));
    expect(read === null || read.off?.size === 24).toBe(true);
  });

  it("is refused where its edges would join, and a word out of order", () => {
    const grid = layoutCells(made.layout);
    expect(decodeLayout(`${grid}|shape|wrap`, 8)).toBeNull();
    expect(decodeLayout(`${grid}|sparse|shape`, 8)).toBeNull();
  });

  it("leaves every code written before shapes as it was: no `off`, and a plain hexagon's corners are still `inHex`'s", () => {
    const square = decodeLayout(generateTsunagi(squareBoard(5), seededRandom(1))!.layout, 5)!;
    expect(square.off).toBeUndefined();
    const hexagon = generateTsunagi(hexagonBoard(3), seededRandom(1))!;
    expect(hexagon.layout.endsWith("|hex")).toBe(true);
    const read = decodeLayout(hexagon.layout, 7)!;
    expect(read.off).toBeUndefined();
    for (let at = 0; at < 49; at += 1) expect(onTheBoard(read, at)).toBe(inHex(7, at));
  });

  it("is drawn as big as it is, and a point is the cell it is over", () => {
    const geometry = tsunagiGeometry(layout);
    expect(geometry.height).toBeGreaterThan(geometry.width);
    expect(geometry.cols).toBe(5);
    expect(geometry.rows).toBe(8);
    const svg = drawTsunagi(layout);
    expect(svg).toContain(`viewBox="0 0 ${geometry.width} ${geometry.height}"`);
    expect(svg).toContain("Tsunagi board, 5 by 8");
    expect(drawTsunagi(layout, { language: "ja" })).toContain("つなぎの盤、5×8");
    expect(drawTsunagi(layout, { coordinates: true }).split('class="tsu-coordinate"').length - 1).toBe(5 + 8);
    for (const cell of [0, 4, 8, 60]) {
      const { x, y } = geometry.centre(cell);
      if (onTheBoard(layout, cell)) expect(cellAtPoint(geometry, x, y)).toBe(cell);
    }
    expect(cellAtPoint(geometry, geometry.width + 10, 50)).toBeNull();
  });

  it("is off the drawing where it is off the board, on a square and a honeycomb", () => {
    const tall = generateTsunagi(tallHexagonBoard(3, 3), seededRandom(1))!;
    const read = decodeLayout(tall.layout, tallHexagonBoard(3, 3).size)!;
    const svg = drawTsunagi(read);
    expect(svg.split('class="tsu-hex-cell"').length - 1).toBe(tallHexagonBoard(3, 3).cells.length);
    const geometry = tsunagiGeometry(read);
    for (const cell of tallHexagonBoard(3, 3).cells) {
      const { x, y } = geometry.centre(cell);
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
      expect(x).toBeLessThan(geometry.width);
      expect(y).toBeLessThan(geometry.height);
      expect(cellAtPoint(geometry, x, y)).toBe(cell);
    }
  });

  it("is looked at through a box as tall as it is", () => {
    expect(keptView({ zoom: 2, x: 0, y: -900 }, 300, 500)).toEqual({ zoom: 2, x: 0, y: -500 });
    expect(zoomedAbout({ zoom: 1, x: 0, y: 0 }, 2, 150, 250, 300, 500)).toEqual({ zoom: 2, x: -150, y: -250 });
  });
});
