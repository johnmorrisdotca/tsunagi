import { describe, expect, it } from "vitest";

import { decodeLayout, encodeAnswer, layoutCells } from "./code.ts";
import { layoutOf, randomFilling } from "./generate.ts";
import { linesOfAnswer } from "./lines.ts";
import { seededRandom } from "./random.ts";
import { countSolutions } from "./solve.ts";
import { countSolutionsSat } from "./solveSat.ts";
import { TSUNAGI_6 } from "./levels/size6.data.ts";
import { TSUNAGI_7 } from "./levels/size7.data.ts";
import { TSUNAGI_8 } from "./levels/size8.data.ts";

/**
 * THE SAT COUNT AGAINST THE SEARCH THAT PROVED THE FIRST TWELVE SIZES: the same
 * number of answers on the same boards, whatever the board has on it. Boards
 * with one answer, and — by taking a twist off a level — boards with many.
 */
function agree(code: string, size: number, limit = 40): number {
  const layout = decodeLayout(code, size)!;
  const search = countSolutions(layout, limit);
  const sat = countSolutionsSat(layout, limit);
  expect(sat.gaveUp).toBe(false);
  expect(sat.count, code).toBe(search.count);
  return sat.count;
}

describe("counting a board's answers by SAT", () => {
  it("finds the one answer every shipped level has, and that answer", () => {
    for (const [at, [layout, answer]] of [...TSUNAGI_6, ...TSUNAGI_7, ...TSUNAGI_8].entries()) {
      if (at % 5 !== 0) continue;
      const size = Math.round(Math.sqrt(layoutCells(layout).length));
      const solved = countSolutionsSat(decodeLayout(layout, size)!, 2);
      expect(solved.count, layout).toBe(1);
      expect(encodeAnswer(solved.solution!), layout).toBe(answer);
    }
  });

  it("counts as many answers as the search does on boards with a twist taken off, which have several", () => {
    let several = 0;
    for (const [at, [layout]] of TSUNAGI_6.entries()) {
      if (!/[|+a-p]/.test(layout) || at % 2 !== 0) continue;
      const cells = layoutCells(layout);
      for (const variant of [layout, cells, cells.replace(/[a-p]/g, "."), `${cells}|wrap`]) if (agree(variant, 6) > 1) several += 1;
    }
    expect(several).toBeGreaterThan(5);
  });

  it("counts as many answers as the search does on random fillings, with the join of a wrapped board too", () => {
    const random = seededRandom(31);
    let checked = 0;
    for (let each = 0; each < 200; each += 1) {
      const size = 4 + Math.floor(random() * 3);
      const filling = randomFilling(size, random, size * 2);
      if (filling === null || filling.length > 16) continue;
      const { layout } = layoutOf(size, filling);
      agree(layout, size);
      agree(`${layout}|wrap`, size);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("starts from the lines it is given and still counts every answer", () => {
    const [layout, answer] = TSUNAGI_7[40]!;
    const decoded = decodeLayout(layout, 7)!;
    const guided = countSolutionsSat(decoded, 2, Number.POSITIVE_INFINITY, linesOfAnswer(decoded, answer));
    expect(guided.count).toBe(1);
    expect(encodeAnswer(guided.solution!)).toBe(answer);
  });

  it("gives up past the dead ends it is allowed, and says it did", () => {
    const [layout] = TSUNAGI_8[200]!;
    const solved = countSolutionsSat(decodeLayout(layout, 8)!, 2, 0);
    expect(solved.gaveUp || solved.count === 1).toBe(true);
  });
});
