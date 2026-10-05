import { describe, expect, it } from "vitest";

import { TSUNAGI_BOARDS, TSUNAGI_BOARD_NAMES } from "./boards.ts";
import { decodeLayout, inHex } from "./code.ts";
import { colourOfPair, hsl, TSUNAGI_COLOUR_SET_NAMES, TSUNAGI_COLOUR_SETS, tsunagiColourSet } from "./colours.ts";
import { drawTsunagi, drawTsunagiCode, drawTsunagiMarble, drawTsunagiPair } from "./draw.ts";
import { cellAtPoint, CELL, tsunagiGeometry } from "./geometry.ts";
import { challengesOf } from "./ladder.ts";
import { loadEveryTsunagiLevel, TSUNAGI_SIZES, tsunagiLevelsOf } from "./levels.ts";
import { linesOfAnswer, ownersOf } from "./lines.ts";
import { TSUNAGI_STRINGS, tsunagiLanguageOf, tsunagiSay } from "./strings.ts";
import { TSUNAGI_STYLE } from "./style.ts";

/**
 * The drawing, on real levels: every part is there once, the options change
 * what they say they change, two drawings never share an id, and the place a
 * finger lands is found by the same arithmetic that placed the drawing.
 */
await loadEveryTsunagiLevel();

function find(want: (givens: string) => boolean): { size: number; givens: string; answer: string } {
  for (const size of TSUNAGI_SIZES) {
    const row = tsunagiLevelsOf(size).find(([givens]) => want(givens));
    if (row !== undefined) return { size, givens: row[0], answer: row[1] };
  }
  throw new Error("no such level");
}
const count = (svg: string, pattern: string): number => svg.split(pattern).length - 1;

const plain = find((g) => challengesOf(g).length === 0 && g.length === 49);
const plainLayout = decodeLayout(plain.givens, plain.size)!;
const solved = linesOfAnswer(plainLayout, plain.answer)!;

describe("drawing a board", () => {
  it("is one svg with a marble at each end of every pair, and no id left unfilled", () => {
    const svg = drawTsunagi(plainLayout);
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg).toContain('class="tsunagi"');
    expect(count(svg, 'class="tsu-marble"')).toBe(plainLayout.ends.length * 2);
    expect(svg).not.toContain("__ID__");
    expect(svg).toContain('role="group"');
    expect(svg).toContain("Tsunagi board, 7 by 7");
    expect(drawTsunagi(plainLayout, { language: "ja" })).toContain("つなぎの盤、7×7");
  });

  it("draws a line for each pair that has one, and a bead in every open cell a line runs through, unless it is lines only", () => {
    const svg = drawTsunagi(plainLayout, { lines: solved });
    expect(count(svg, 'class="tsu-line"')).toBe(plainLayout.ends.length);
    const owned = ownersOf(plainLayout, solved).filter((owner, at) => owner >= 0 && plainLayout.cells[at]! < 0).length;
    expect(count(svg, 'class="tsu-bead"')).toBe(owned);
    expect(count(drawTsunagi(plainLayout, { lines: solved, fill: "lines" }), 'class="tsu-bead"')).toBe(0);
    expect(drawTsunagi(plainLayout, { lines: solved, fill: "lines" })).toContain('data-fill="lines"');
    expect(count(drawTsunagi(plainLayout), 'class="tsu-line"')).toBe(0);
  });

  it("writes the pair's number on its marbles for numbers, and nothing on them for colours", () => {
    expect(count(drawTsunagi(plainLayout), 'class="tsu-num"')).toBe(0);
    const numbers = drawTsunagi(plainLayout, { marks: "numbers" });
    expect(count(numbers, 'class="tsu-num"')).toBe(plainLayout.ends.length * 2);
    expect(numbers).toContain(">1</text>");
    expect(numbers).toContain(`>${plainLayout.ends.length}</text>`);
    expect(numbers).toContain('data-marks="numbers"');
  });

  it("paints each pair in its colour from the colour set asked for, and a set of your own", () => {
    for (const name of TSUNAGI_COLOUR_SET_NAMES) {
      const svg = drawTsunagi(plainLayout, { colours: name });
      expect(svg).toContain(hsl(colourOfPair(TSUNAGI_COLOUR_SETS[name], 0), 28));
    }
    expect(drawTsunagi(plainLayout, { colours: [[120, 50, 40]] })).toContain("hsl(120, 50%, 40%)");
    expect(drawTsunagi(plainLayout, { colours: "bright" })).not.toBe(drawTsunagi(plainLayout, { colours: "marble" }));
  });

  it("wears the board asked for, and the plain paper leaves its colours to the page", () => {
    expect(drawTsunagi(plainLayout)).not.toContain("style=");
    expect(drawTsunagi(plainLayout)).toContain('data-board="paper"');
    for (const name of TSUNAGI_BOARD_NAMES.filter((each) => each !== "paper")) expect(drawTsunagi(plainLayout, { board: name })).toContain(`--tsu-frame:${TSUNAGI_BOARDS[name].frame}`);
    expect(drawTsunagi(plainLayout, { board: { ...TSUNAGI_BOARDS.paper, paper: "#ffeedd" } })).toContain("--tsu-paper:#ffeedd");
  });

  it("flashes both marbles of the pairs flagged, bursts the cells blasted, and washes a solved board", () => {
    const svg = drawTsunagi(plainLayout, { flagged: [0, 2], blasted: [5] });
    expect(count(svg, 'class="tsu-flag"')).toBe(4);
    expect(count(svg, 'class="tsu-blast"')).toBe(1);
    expect(count(svg, 'class="tsu-solved"')).toBe(0);
    expect(drawTsunagi(plainLayout, { lines: solved, done: true })).toContain('class="tsu-solved"');
    expect(drawTsunagi(plainLayout, { lines: solved, done: true })).toContain('data-solved="true"');
  });

  it("draws the coordinates down the sides when asked, and a standalone image with its style", () => {
    expect(count(drawTsunagi(plainLayout, { coordinates: true }), 'class="tsu-coordinate"')).toBe(14);
    expect(count(drawTsunagi(plainLayout), 'class="tsu-coordinate"')).toBe(0);
    expect(drawTsunagi(plainLayout, { style: true })).toContain(TSUNAGI_STYLE);
  });

  it("gives drawings ids of their own: the same drawing the same, two different ones apart", () => {
    const one = drawTsunagi(plainLayout);
    expect(drawTsunagi(plainLayout)).toBe(one);
    const idOf = (svg: string) => /id="([^"]+)-paper"/.exec(svg)![1];
    expect(idOf(drawTsunagi(plainLayout, { marks: "numbers" }))).not.toBe(idOf(one));
    expect(idOf(drawTsunagi(plainLayout, { id: "mine" }))).toBe("mine");
  });

  it("draws a level from its code, and nothing for a code that is none", () => {
    expect(drawTsunagiCode(plain.givens, plain.size, { lines: solved })).toBe(drawTsunagi(plainLayout, { lines: solved }));
    expect(drawTsunagiCode("junk", 7)).toBe("");
  });

  it("draws one marble alone", () => {
    expect(drawTsunagiMarble(2)).toContain("<circle");
    expect(drawTsunagiMarble(2, { marks: "numbers" })).toContain(">3</text>");
  });
});

describe("the twists", () => {
  it("a bridge is a deck cut out of every line, with the line going across drawn over it and the one going down beneath", () => {
    const level = find((g) => challengesOf(g).includes("bridges") && !challengesOf(g).includes("walls"));
    const layout = decodeLayout(level.givens, level.size)!;
    const bridges = layout.cells.filter((cell) => cell === -3).length;
    const lines = linesOfAnswer(layout, level.answer)!;
    const svg = drawTsunagi(layout, { lines });
    expect(count(svg, 'class="tsu-bridge"')).toBe(bridges);
    expect(count(svg, 'class="tsu-deck"')).toBe(bridges);
    expect(count(svg, 'class="tsu-over-bridge"')).toBe(bridges);
    expect(svg).toContain("<mask ");
    expect(count(svg, 'fill="black"')).toBe(bridges);
    expect(svg).toContain('mask="url(#');
    expect(count(drawTsunagi(layout), 'class="tsu-over-bridge"')).toBe(0);
    expect(count(drawTsunagi(plainLayout, { lines: solved }), "<mask ")).toBe(0);
  });

  it("a wall is a thick bar for each edge, and a blocked cell a dark square", () => {
    const level = find((g) => challengesOf(g).includes("walls") && g.includes("|") && /\d-\d/.test(g));
    const layout = decodeLayout(level.givens, level.size)!;
    const svg = drawTsunagi(layout);
    expect(count(svg, 'class="tsu-wall"')).toBe(layout.walls.size);
    expect(count(svg, 'class="tsu-blocked"')).toBe(layout.cells.filter((cell) => cell === -2).length);
  });

  it("a waypoint is a ring of its pair's colour, with the number inside it for numbers", () => {
    const level = find((g) => challengesOf(g).includes("waypoints"));
    const layout = decodeLayout(level.givens, level.size)!;
    expect(count(drawTsunagi(layout), 'class="tsu-waypoint"')).toBe(layout.waypoints.size);
    expect(count(drawTsunagi(layout, { marks: "numbers" }), 'class="tsu-num"')).toBe(layout.ends.length * 2 + layout.waypoints.size);
  });

  it("a board that wraps has a dashed rim and a ghost of the far edge, which can be left out", () => {
    const level = find((g) => challengesOf(g).includes("wrap"));
    const layout = decodeLayout(level.givens, level.size)!;
    const svg = drawTsunagi(layout);
    expect(svg).toContain('class="tsu-rim"');
    expect(svg).toContain('class="tsu-ghosts"');
    expect(svg).toContain('data-wrap="true"');
    expect(drawTsunagi(layout, { ghosts: false })).not.toContain("tsu-ghosts");
    expect(tsunagiGeometry(layout).side).toBeGreaterThan(tsunagiGeometry(layout, { ghosts: false }).side);
  });

  it("a hexagon is a honeycomb of outlined cells with the square's corners left off, in a square box", () => {
    const level = find((g) => challengesOf(g).includes("hexagon"));
    const layout = decodeLayout(level.givens, level.size)!;
    const svg = drawTsunagi(layout, { lines: linesOfAnswer(layout, level.answer)! });
    const cells = Array.from({ length: layout.size * layout.size }, (_, at) => at).filter((at) => inHex(layout.size, at)).length;
    expect(count(svg, 'class="tsu-hex-cell"')).toBe(cells);
    expect(svg).toContain('data-hex="true"');
    expect(svg).not.toContain("tsu-grid");
    const geometry = tsunagiGeometry(layout);
    expect(geometry.paper.width).toBe(geometry.paper.height);
  });
});

describe("where a finger lands", () => {
  const levels = [
    ["a square board", plain],
    ["a board with coordinates", plain],
    ["a board that wraps", find((g) => challengesOf(g).includes("wrap"))],
    ["a hexagon", find((g) => challengesOf(g).includes("hexagon"))],
  ] as const;
  for (const [name, level] of levels) {
    it(`is the cell whose middle it is on, on ${name}`, () => {
      const layout = decodeLayout(level.givens, level.size)!;
      const geometry = tsunagiGeometry(layout, { coordinates: name.includes("coordinates") });
      for (let cell = 0; cell < layout.size * layout.size; cell += 1) {
        const { x, y } = geometry.centre(cell);
        if (geometry.onBoard(cell)) expect(cellAtPoint(geometry, x, y), `cell ${cell}`).toBe(cell);
        else if (layout.hex) expect(cellAtPoint(geometry, x, y)).not.toBe(cell);
      }
      // Off the board, in the frame: nothing.
      expect(cellAtPoint(geometry, -5, -5)).toBeNull();
      expect(cellAtPoint(geometry, geometry.side + 5, geometry.side / 2)).toBeNull();
    });
  }

  it("is the real cell a ghost shows, on a board that wraps", () => {
    const level = find((g) => challengesOf(g).includes("wrap"));
    const layout = decodeLayout(level.givens, level.size)!;
    const geometry = tsunagiGeometry(layout);
    const { paper } = geometry;
    // The ghost cell in the top left corner of the ring is the board's last cell.
    expect(cellAtPoint(geometry, paper.x + CELL / 2, paper.y + CELL / 2)).toBe(layout.size * layout.size - 1);
    // The ghost cell left of the first row's first cell is the first row's last.
    expect(cellAtPoint(geometry, paper.x + CELL / 2, paper.y + CELL * 1.5)).toBe(layout.size - 1);
  });

  it("is the same box for every board of a size, whatever is drawn on it", () => {
    const empty = drawTsunagi(plainLayout).match(/viewBox="([^"]+)"/)![1];
    expect(drawTsunagi(plainLayout, { lines: solved, marks: "numbers", fill: "lines", board: "wood" }).match(/viewBox="([^"]+)"/)![1]).toBe(empty);
  });
});

describe("colour sets and words", () => {
  it("each colour set has a colour for every one of the eighty-two pairs a board can have, a set of your own is used round and round, and an unknown one is the default", () => {
    for (const name of TSUNAGI_COLOUR_SET_NAMES) expect(TSUNAGI_COLOUR_SETS[name]).toHaveLength(82);
    expect(colourOfPair([[1, 2, 3], [4, 5, 6]], 3)).toEqual([4, 5, 6]);
    expect(tsunagiColourSet("nonsense" as never)).toBe(TSUNAGI_COLOUR_SETS.marble);
    expect(tsunagiColourSet(undefined)).toBe(TSUNAGI_COLOUR_SETS.marble);
    expect(tsunagiColourSet([])).toBe(TSUNAGI_COLOUR_SETS.marble);
  });

  it("no colour set repeats a colour anywhere in its eighty-two, and begins with the sixteen every board to 15×15 was drawn in", () => {
    for (const name of TSUNAGI_COLOUR_SET_NAMES) expect(new Set(TSUNAGI_COLOUR_SETS[name].map((colour) => colour.join())).size, name).toBe(82);
    expect(TSUNAGI_COLOUR_SETS.marble.slice(0, 3)).toEqual([[24, 100, 44], [202, 77, 60], [54, 88, 56]]);
  });

  it("no colour set repeats a colour within its first eight pairs", () => {
    for (const name of TSUNAGI_COLOUR_SET_NAMES) expect(new Set(TSUNAGI_COLOUR_SETS[name].slice(0, 8).map((colour) => colour.join())).size).toBe(8);
  });

  it("English and Japanese say the same things, with the same values left to fill in", () => {
    const en = Object.keys(TSUNAGI_STRINGS.en).filter((key) => !key.endsWith("One"));
    for (const key of en) expect(TSUNAGI_STRINGS.ja[key], key).toBeTruthy();
    for (const key of Object.keys(TSUNAGI_STRINGS.ja)) expect(TSUNAGI_STRINGS.en[key], key).toBeTruthy();
    for (const key of en) expect([...(TSUNAGI_STRINGS.ja[key] ?? "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), key).toEqual([...TSUNAGI_STRINGS.en[key]!.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort());
  });

  it("fills values in, says one where there is one, and falls back to English and then to the key", () => {
    expect(tsunagiSay("en", "checkMissing", { n: 2 })).toBe("2 pairs are not joined yet: their marbles are flashing.");
    expect(tsunagiSay("en", "checkMissing", { n: 1 })).toBe("1 pair is not joined yet: its marbles are flashing.");
    expect(tsunagiSay("ja", "checkMissing", { n: 1 })).toContain("1つ");
    expect(tsunagiSay("ja", "nothing here")).toBe("nothing here");
    expect(tsunagiLanguageOf("ja-JP")).toBe("ja");
    expect(tsunagiLanguageOf("fr")).toBe("en");
    expect(tsunagiLanguageOf(null)).toBe("en");
  });
});

describe("one pair's part of a drawing", () => {
  const idOf = (svg: string) => /id="([^"]+)-paper"/.exec(svg)![1]!;

  it("is what the whole drawing holds for that pair: its line, its washes and its little marbles", () => {
    for (const options of [{}, { fill: "lines" as const }, { marks: "numbers" as const }]) {
      const whole = drawTsunagi(plainLayout, { ...options, lines: solved });
      const id = idOf(whole);
      for (let pair = 0; pair < plainLayout.ends.length; pair += 1) {
        const part = drawTsunagiPair(plainLayout, pair, id, { ...options, lines: solved });
        // The line is the very group the whole drawing has.
        const line = new RegExp(`<g class="tsu-line" data-pair="${pair}" data-cells="\\d+">.*?</g>`).exec(whole)?.[0];
        expect(part.line, `pair ${pair}`).toBe(line);
        expect(count(part.beads, 'class="tsu-bead"'), `pair ${pair}`).toBe(count(whole, `class="tsu-bead" data-pair="${pair}"`));
        const washes = new RegExp(`<g class="tsu-washes">(?:.*?)<g data-pair="${pair}">(.*?)</g>`).exec(whole)![1]!;
        expect(part.washes, `pair ${pair}`).toBe(washes);
      }
    }
  });

  it("has no line for a pair that has none drawn, and none of its own beads when the fill is lines only", () => {
    expect(drawTsunagiPair(plainLayout, 0, "x", {}).line).toBe("");
    expect(drawTsunagiPair(plainLayout, 0, "x", { lines: solved, fill: "lines" }).beads).toBe("");
    expect(drawTsunagiPair(plainLayout, 0, "x", { lines: solved }).beads).toContain("url(#x-b0)");
  });

  it("holds the ghost beads of a board that wraps, each pair's in a group of its own", () => {
    const wrap = find((g) => challengesOf(g).includes("wrap") && challengesOf(g).length === 1);
    const layout = decodeLayout(wrap.givens, wrap.size)!;
    const lines = linesOfAnswer(layout, wrap.answer)!;
    const whole = drawTsunagi(layout, { lines });
    const id = idOf(whole);
    const ghostBeads = layout.ends.map((_, pair) => count(drawTsunagiPair(layout, pair, id, { lines }).ghosts, 'class="tsu-bead"'));
    expect(ghostBeads.some((each) => each > 0)).toBe(true);
    // The ghosts are the last thing in the drawing: every ghost bead in it is some pair's.
    const ghosts = whole.slice(whole.indexOf('<g class="tsu-ghosts"'), whole.indexOf("</svg>"));
    expect(ghostBeads.reduce((sum, each) => sum + each, 0)).toBe(count(ghosts, 'class="tsu-bead"'));
  });
});
