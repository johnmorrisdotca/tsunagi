import { describe, expect, it } from "vitest";

import { checkTsunagiAnswer } from "./check.ts";
import { CAPITAL_PAIRS, CELL_EMPTY, decodeLayout, encodeAnswer, encodeLayout, PAIR_LETTERS, stoneLetters, WAYPOINT_LETTERS } from "./code.ts";
import { relettered, symmetryKey } from "./generate.ts";
import { challengesOf } from "./ladder.ts";
import { linesOfAnswer } from "./lines.ts";

/**
 * THE CHARACTERS A PAIR IS NAMED BY: sixteen were enough to 15×15, and a 30×30 board with
 * as many lines to the cell has dozens. A layout written before the list grew is the same
 * string; a small letter is a waypoint until a board uses every capital and digit, and a
 * stone after that.
 */
describe("the characters a pair is named by", () => {
  it("are eighty-two, none repeated and none a character the layout's code uses for something else", () => {
    expect(PAIR_LETTERS).toHaveLength(82);
    expect(new Set(PAIR_LETTERS).size).toBe(82);
    for (const reserved of ".#+|") expect(PAIR_LETTERS).not.toContain(reserved);
    // The first sixteen are the letters every level to 15×15 is written in.
    expect(PAIR_LETTERS.startsWith("ABCDEFGHIJKLMNOP")).toBe(true);
    expect(WAYPOINT_LETTERS).toBe(PAIR_LETTERS.slice(CAPITAL_PAIRS, CAPITAL_PAIRS + 26));
    expect(WAYPOINT_LETTERS).toHaveLength(26);
  });

  it("read a board of fifty pairs, the small letters stones once every capital and digit is used", () => {
    // Ten across and five down of pairs side by side: AABBCC…, each letter twice.
    const letters = [...PAIR_LETTERS].slice(0, 50);
    const code = letters.map((letter) => letter + letter).join("");
    const layout = decodeLayout(code, 10)!;
    expect(layout).not.toBeNull();
    expect(layout.ends).toHaveLength(50);
    expect(layout.ends[36]).toEqual([72, 73]);
    expect(stoneLetters(code)).toBe(PAIR_LETTERS);
    // Written again from its cells, it is the same string.
    const cells = layout.cells;
    expect(encodeLayout(cells)).toBe(code);
    // And every letter used twice, in reading order, or it is no layout.
    expect(decodeLayout(code.replace("aa", "a."), 10)).toBeNull();
    expect(decodeLayout(code.replace("AABB", "BBAA"), 10)).toBeNull();
  });

  it("read a small letter as a waypoint on a board that does not use every capital and digit, and refuse a waypoint past thirty-five pairs", () => {
    const board = decodeLayout("Aa..A....", 3)!;
    expect(board.waypoints.get(1)).toBe(0);
    expect(challengesOf("Aa..A....")).toEqual(["waypoints"]);
    // A board with every capital and digit used cannot name a waypoint.
    const cells = new Array<number>(100).fill(CELL_EMPTY);
    for (let pair = 0; pair < 36; pair += 1) cells[2 * pair] = cells[2 * pair + 1] = pair;
    expect(encodeLayout(cells, [], { waypoints: new Map([[90, 0]]) })).toContain("?");
    expect(challengesOf(`${[...Array(36).keys()].map((pair) => PAIR_LETTERS[pair]!.repeat(2)).join("")}a.`.padEnd(100, "."))).not.toContain("waypoints");
  });

  it("reletter in reading order, a board of dozens of pairs as any other", () => {
    const code = [...PAIR_LETTERS].slice(0, 50).map((letter) => letter + letter).join("");
    expect(relettered(code)).toBe(code);
    const shuffled = [...code].reverse().join("");
    // Reversed, the letters are named from their first stone again: the same board, the same spelling.
    expect(relettered(shuffled)).toBe(code);
    expect(symmetryKey(code, 10)).toBe(symmetryKey(shuffled, 10));
  });

  it("check and draw answers of fifty lines", () => {
    // Fifty pairs of two cells each is a board of fifty lines of two: the check takes it, and the lines read back.
    const letters = [...PAIR_LETTERS].slice(0, 50);
    const code = letters.map((letter) => letter + letter).join("");
    const layout = decodeLayout(code, 10)!;
    expect(checkTsunagiAnswer(10, code, code)).toEqual({ ok: true });
    const lines = linesOfAnswer(layout, code)!;
    expect(lines).toHaveLength(50);
    expect(lines[40]).toEqual([80, 81]);
    expect(encodeAnswer(lines.flatMap((line, pair) => line.map((cell) => [cell, pair] as const)).sort((a, b) => a[0] - b[0]).map(([, pair]) => pair))).toBe(code);
  });
});
