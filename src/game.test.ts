import { describe, expect, it } from "vitest";

import { checkTsunagiAnswer } from "./check.ts";
import { decodeLayout } from "./code.ts";
import {
  cheatGame,
  checkGame,
  dragGame,
  gameOver,
  helpOf,
  helpOpensNext,
  liftGame,
  newTsunagiGame,
  outOfStrokes,
  pressGame,
  restartGame,
  strongestTsunagiHelp,
  tsunagiProgress,
  undoGame,
  type TsunagiGame,
} from "./game.ts";
import { challengesOf } from "./ladder.ts";
import { loadEveryTsunagiLevel, TSUNAGI_SIZES, tsunagiLevelsOf } from "./levels.ts";
import { answerOf, linesOfAnswer } from "./lines.ts";

/**
 * A game in play: what a press, a drag and a lifted finger do to the lines, the
 * strokes and Undo, the explosions and the stroke limit, Check and Cheat, and a
 * real level solved along its stored answer.
 */
await loadEveryTsunagiLevel();

/** The first level at a size whose layout code satisfies `want`. */
function find(want: (givens: string) => boolean): { size: number; givens: string; answer: string } {
  for (const size of TSUNAGI_SIZES) {
    const row = tsunagiLevelsOf(size).find(([givens]) => want(givens));
    if (row !== undefined) return { size, givens: row[0], answer: row[1] };
  }
  throw new Error("no such level");
}

/** One stroke: press, drag through every cell, let go. */
function stroke(game: TsunagiGame, cells: readonly number[]): TsunagiGame {
  let now = pressGame(game, cells[0]!);
  for (const cell of cells.slice(1)) now = dragGame(now, cell);
  return liftGame(now);
}

/** Every pair drawn along the answer, a stroke each. */
function solve(game: TsunagiGame): TsunagiGame {
  const lines = linesOfAnswer(game.layout, game.answer!)!;
  return lines.reduce((now, line) => stroke(now, line), game);
}

describe("a game of a real level", () => {
  it("is solved by drawing every pair along its answer, and says so with the answer ready for the server", () => {
    const { size, givens, answer } = find((g) => challengesOf(g).length === 0 && g.length === 36);
    const start = newTsunagiGame(givens, size, { answer })!;
    expect(start.solved).toBe(false);
    const won = solve(start);
    expect(won.solved).toBe(true);
    expect(won.strokes).toBe(start.layout.ends.length);
    expect(checkTsunagiAnswer(size, givens, answerOf(won.layout, won.lines)).ok).toBe(true);
    expect(tsunagiProgress(won)).toMatchObject({ solved: true, joined: start.layout.ends.length, filled: won.layout.cells.length });
  });

  it("is solved on a board with bridges, walls and explosions too, since the stroke that solves sets nothing off", () => {
    const { size, givens, answer } = find((g) => challengesOf(g).includes("bridges") && challengesOf(g).includes("explosions") && challengesOf(g).includes("walls"));
    const won = solve(newTsunagiGame(givens, size, { answer, explosions: "off" })!);
    expect(won.solved).toBe(true);
  });

  it("refuses a layout that is no layout", () => {
    expect(newTsunagiGame("nonsense", 5)).toBeNull();
  });

  it("takes any joined, full board for a solve where it has no stored answer", () => {
    const { size, givens, answer } = find((g) => challengesOf(g).length === 0 && g.length === 36);
    const lines = linesOfAnswer(decodeLayout(givens, size)!, answer)!;
    const won = lines.reduce((now, line) => stroke(now, line), newTsunagiGame(givens, size)!);
    expect(won.solved).toBe(true);
  });
});

describe("strokes, Undo and Restart", () => {
  const { size, givens, answer } = find((g) => challengesOf(g).length === 0 && g.length === 36);
  const start = newTsunagiGame(givens, size, { answer })!;
  const lines = linesOfAnswer(start.layout, answer)!;

  it("count a line let go having changed the board, and a tap on a marble that draws nothing counts none", () => {
    const tapped = liftGame(pressGame(start, lines[0]![0]!));
    expect(tapped.strokes).toBe(0);
    expect(tapped.lines.every((line) => line.length === 0)).toBe(true);
    expect(stroke(start, lines[0]!).strokes).toBe(1);
  });

  it("let Undo take the last stroke back, one at a time, and never past the start", () => {
    const two = stroke(stroke(start, lines[0]!), lines[1]!);
    const one = undoGame(two);
    expect(one.lines[1]).toEqual([]);
    expect(one.lines[0]).toEqual(lines[0]);
    expect(undoGame(undoGame(one)).lines.every((line) => line.length === 0)).toBe(true);
    expect(undoGame(start)).toBe(start);
  });

  it("let Restart clear the board and the strokes, and Undo bring the lines back", () => {
    const two = stroke(stroke(start, lines[0]!), lines[1]!);
    const cleared = restartGame(two);
    expect(cleared.lines.every((line) => line.length === 0)).toBe(true);
    expect(cleared.strokes).toBe(0);
    expect(undoGame(cleared).lines).toEqual(two.lines);
    expect(restartGame(cleared)).toBe(cleared);
  });

  it("let a solved game be restarted, and Undo then give the solve back as solved", () => {
    const won = solve(start);
    const again = restartGame(won);
    expect(again.solved).toBe(false);
    expect(undoGame(again).solved).toBe(true);
  });

  it("take nothing while a finger is down but its own drag, and nothing at all once solved", () => {
    const drawing = pressGame(start, lines[0]![0]!);
    expect(pressGame(drawing, lines[1]![0]!)).toBe(drawing);
    expect(undoGame(drawing)).toBe(drawing);
    const won = solve(start);
    expect(pressGame(won, lines[0]![0]!)).toBe(won);
    expect(gameOver(won)).toBe(true);
  });

  it("never change the game they were given", () => {
    const before = JSON.stringify(start);
    stroke(start, lines[0]!);
    expect(JSON.stringify(start)).toBe(before);
  });
});

describe("Check", () => {
  const { size, givens, answer } = find((g) => challengesOf(g).length === 0 && g.length === 36);
  const start = newTsunagiGame(givens, size, { answer })!;
  const lines = linesOfAnswer(start.layout, answer)!;

  it("flags the pairs not joined and counts the empty cells, and the flags go with the next change", () => {
    const some = stroke(start, lines[0]!);
    const checked = checkGame(some);
    expect(checked.flagged).toEqual(start.layout.ends.map((_, pair) => pair).slice(1));
    expect(checked.checked).toMatchObject({ unjoined: start.layout.ends.length - 1 });
    expect(pressGame(checked, lines[1]![0]!).flagged).toBeNull();
  });
});

describe("a stroke limit", () => {
  const level = find((g) => challengesOf(g).includes("strokes") && !challengesOf(g).includes("bridges"));
  const start = newTsunagiGame(level.givens, level.size, { answer: level.answer })!;
  const limit = start.layout.strokes!;

  it("is spent a stroke at a time, Undo gives none back, and a game out of them takes nothing until Restart", () => {
    const lines = linesOfAnswer(start.layout, level.answer)!;
    const [a, b, c] = lines[0]!;
    // Waste every stroke on one line, drawn longer and cut back again.
    let now = start;
    for (let spent = 0; spent < limit; spent += 1) {
      expect(tsunagiProgress(now).strokesLeft).toBe(limit - spent);
      now = spent % 2 === 0 ? stroke(now, [a!, b!, c!]) : stroke(now, [b!]);
    }
    expect(outOfStrokes(now)).toBe(true);
    expect(tsunagiProgress(now).strokesLeft).toBe(0);
    expect(pressGame(now, lines[1]![0]!)).toBe(now);
    expect(undoGame(now)).toBe(now);
    const again = restartGame(now);
    expect(tsunagiProgress(again).strokesLeft).toBe(limit);
    expect(pressGame(again, lines[1]![0]!)).not.toBe(again);
  });

  it("is solved inside it", () => {
    expect(solve(start).solved).toBe(true);
  });
});

describe("explosions", () => {
  const level = find((g) => challengesOf(g).includes("explosions") && !challengesOf(g).includes("strokes"));
  const rule = decodeLayout(level.givens, level.size)!.explosions!;

  /** Waste strokes on the first line's first two cells until the explosion goes off. */
  function until(game: TsunagiGame): TsunagiGame {
    const lines = linesOfAnswer(game.layout, level.answer)!;
    let now = game;
    for (let at = 0; at < 4 * rule.every && now.exploded === null; at += 1) {
      const line = lines[at % lines.length]!;
      now = stroke(now, line.slice(0, 3));
    }
    return now;
  }

  it("count down, break the line the rule chose, burst where it was and leave nothing to undo", () => {
    const start = newTsunagiGame(level.givens, level.size, { answer: level.answer })!;
    expect(tsunagiProgress(start).boomIn).toBe(rule.every);
    const blown = until(start);
    expect(blown.exploded).not.toBeNull();
    expect(blown.blasted!.length).toBeGreaterThan(0);
    expect(blown.undo).toEqual([]);
    expect(blown.strokes % rule.every).toBe(0);
    expect(tsunagiProgress(blown).boomIn).toBe(rule.every);
  });

  it("are softened or off as chosen, and the game is helped when they are", () => {
    const soft = newTsunagiGame(level.givens, level.size, { answer: level.answer, explosions: "soft" })!;
    expect(soft.layout.explosions).toEqual({ every: rule.every * 2, blast: false });
    expect(helpOf(soft)).toBe("explosions-soft");
    const off = newTsunagiGame(level.givens, level.size, { answer: level.answer, explosions: "off" })!;
    expect(off.layout.explosions).toBeNull();
    expect(helpOf(off)).toBe("explosions-off");
    expect(tsunagiProgress(off).boomIn).toBeNull();
    expect(until(off).exploded).toBeNull();
    expect(helpOf(newTsunagiGame(level.givens, level.size, { answer: level.answer })!)).toBeNull();
  });

  it("are not a help on a board that has none", () => {
    const plain = find((g) => challengesOf(g).length === 0);
    expect(helpOf(newTsunagiGame(plain.givens, plain.size, { explosions: "off" })!)).toBeNull();
  });
});

describe("Cheat", () => {
  const { size, givens, answer } = find((g) => challengesOf(g).length === 0 && g.length === 36);

  it("is not offered unless asked for at the start, and needs the answer", () => {
    const off = newTsunagiGame(givens, size, { answer })!;
    expect(cheatGame(off)).toBe(off);
    const noAnswer = newTsunagiGame(givens, size, { cheats: true })!;
    expect(cheatGame(noAnswer)).toBe(noAnswer);
  });

  it("draws one line as the answer has it, spends no stroke, can be undone, and marks the game helped", () => {
    const start = newTsunagiGame(givens, size, { answer, cheats: true })!;
    const drawn = cheatGame(start);
    expect(drawn.lines.filter((line) => line.length > 0)).toHaveLength(1);
    expect(drawn.strokes).toBe(0);
    expect(helpOf(drawn)).toBe("cheated");
    expect(undoGame(drawn).lines.every((line) => line.length === 0)).toBe(true);
  });

  it("solves a board by drawing every line, and the solve is helped", () => {
    let now = newTsunagiGame(givens, size, { answer, cheats: true })!;
    for (let at = 0; at < now.layout.ends.length && !now.solved; at += 1) now = cheatGame(now);
    expect(now.solved).toBe(true);
    expect(helpOf(now)).toBe("cheated");
    expect(helpOf(restartGame(now))).toBeNull();
  });
});

describe("help", () => {
  it("is kept as the one that costs more, and only explosions off opens no next block", () => {
    expect(strongestTsunagiHelp([null, null])).toBeNull();
    expect(strongestTsunagiHelp(["explosions-soft", "cheated"])).toBe("cheated");
    expect(strongestTsunagiHelp(["cheated", "explosions-off"])).toBe("explosions-off");
    expect(helpOpensNext("explosions-off")).toBe(false);
    for (const help of [null, "cheated", "explosions-soft"] as const) expect(helpOpensNext(help)).toBe(true);
  });
});
