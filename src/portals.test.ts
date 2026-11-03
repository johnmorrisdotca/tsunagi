import { describe, expect, it } from "vitest";
import { checkTsunagiAnswer } from "./check.ts";
import {
  CELL_BLOCKED,
  CELL_EMPTY,
  decodeLayout,
  encodeAnswer,
  encodeLayout,
  type LinkLayout,
  portalExit,
} from "./code.ts";
import { symmetryKey, transformed } from "./generate.ts";
import { codeOf, SIX } from "./portals.fixture.ts";
import { seededRandom } from "./random.ts";
import { countSolutions } from "./solve.ts";
import { countSolutionsSat } from "./solveSat.ts";
import { stepTable } from "./steps.ts";

describe("portals in a layout's code", () => {
  it("are read after the cells, each as its two cells, the smaller first", () => {
    const layout = decodeLayout(SIX, 6)!;
    expect(layout.portalPairs).toEqual([[14, 28]]);
    expect([...layout.portals]).toEqual([
      [14, 28],
      [28, 14],
    ]);
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
    const refused = (portals: string, stones: Record<string, [number, number]> = { A: [12, 35] }) =>
      decodeLayout(codeOf(6, stones, portals), 6);
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
    expect(
      portalExit(decodeLayout(codeOf(6, { A: [0, 35] }, "10-29").replace("|portals", "|wrap|portals"), 6)!, 9, 10),
    ).toBe(24);
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
      if (at === ends[pair]![1]) {
        go(pair + 1, ends[pair + 1]?.[0] ?? 0);
        return;
      }
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
      const code = encodeLayout(cells, [], {
        wrap: random() < 0.3,
        portals: Array.from(
          { length: portalCount },
          (_, each) => [portalCells[2 * each]!, portalCells[2 * each + 1]!] as const,
        ),
      });
      const layout = decodeLayout(code, size);
      if (layout === null) continue;
      tested += 1;
      const plain = brute(layout);
      const counted = countSolutionsSat(
        layout,
        50,
        Number.POSITIVE_INFINITY,
        null,
        tested % 2 === 0 ? "one-hot" : "binary",
      );
      expect(counted.count, code).toBe(Math.min(plain.answers.length, 50));
      if (plain.answers.length <= 50)
        expect(new Set(counted.solutions.map(encodeAnswer))).toEqual(new Set(plain.answers));
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
