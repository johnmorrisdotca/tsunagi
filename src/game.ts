import { decodeLayout, type LinkLayout } from "./code.ts";
import { cheatLine } from "./cheat.ts";
import { explosionAfter, explosionsAsChosen, strokesToExplosion } from "./explosions.ts";
import { allJoined, answerOf, dragFinger, filled, joined, letGo, linesOfAnswer, NO_REACH, noLines, pressAt, unjoinedPairs, type Lines, type Reach } from "./lines.ts";

/**
 * A TSUNAGI GAME IN PLAY, as pure functions: the lines drawn so far, the
 * strokes taken, what Undo would give back, and what a press, a drag and a
 * lifted finger do. This is what a page does between the finger and the
 * drawing; `mountTsunagi` and the `<tsunagi-board>` element are made of it,
 * and a page that draws for itself can be too. No page needed, so a server can
 * replay a game's strokes.
 *
 * Every function returns a new game and leaves the one it was given alone.
 *
 *  - A STROKE is a line let go having changed the board. Strokes are counted:
 *    a board with a stroke limit allows only so many (Undo gives none back,
 *    and a game out of them takes nothing more until `restartGame`), and on a
 *    board with explosions, the stroke that sets one off breaks a line and
 *    leaves nothing to undo: an explosion is not taken back. The stroke that
 *    solves the board sets nothing off.
 *  - HELP is chosen before play: a board's explosions as made, softened or off,
 *    and whether Cheat, which draws one unfinished line, is offered. A solve
 *    that used either is `helped`.
 *  - CHECK flags the pairs not yet joined; the flags go with the next change.
 */

/** How a board's explosions are played: as made, softened (a boom for a blast, half as often) or not at all. */
export type TsunagiExplosionChoice = "on" | "soft" | "off";

/** The help a solve used: Cheat drew a line, or explosions were softened or turned off. */
export type TsunagiHelp = "cheated" | "explosions-soft" | "explosions-off";

/** What a game is told when it starts. */
export type TsunagiGameOptions = {
  /** The board's one answer, as a code. With it, a solve must be that answer and Cheat is possible; without it, any full, joined board is a solve. */
  answer?: string;
  /** Explosions as made (the default), softened or off. */
  explosions?: TsunagiExplosionChoice;
  /** Whether Cheat is offered. Default false. */
  cheats?: boolean;
  /** Lines to start from, to carry on a game kept half-played (`decodeLines`). */
  lines?: Lines;
};

export type TsunagiGame = {
  /** The layout as it is played: its explosions as chosen. */
  layout: LinkLayout;
  /** The layout code the game was made from, which decides which line an explosion breaks. */
  givens: string;
  answer: string | null;
  lines: Lines;
  /** What Undo would give back, most recent last: up to 200. */
  undo: readonly Lines[];
  /** Strokes taken since the game started or was restarted. */
  strokes: number;
  /** The pair being drawn this moment, or null between strokes. */
  drawing: number | null;
  /** The lines as they were when the pair being drawn was pressed. */
  before: Lines | null;
  /** How far the finger is from the end of the line it draws, once that has been through a portal (`Reach`). */
  reach: Reach;
  /** Pairs Check found not joined, until the board next changes. */
  flagged: readonly number[] | null;
  /** The cells the last explosion took a line out of, until the next press. */
  blasted: readonly number[] | null;
  /** What the last explosion did: `boom` (one line halved) or `blast` (a line wiped and its neighbour halved). */
  exploded: "boom" | "blast" | null;
  /** What Check said last, until the board changes: how many pairs are not joined, and how many cells are empty. */
  checked: { unjoined: number; empty: number } | null;
  cheats: boolean;
  explosions: TsunagiExplosionChoice;
  /** The help the explosions' choice amounts to on this board: softened or off, where the board has any; null otherwise. */
  eased: TsunagiHelp | null;
  /** Whether Cheat was used in this attempt. */
  cheated: boolean;
  solved: boolean;
};

const UNDO_MOST = 200;

/** A game on a layout code, or null for a code that is no layout at that size. */
export function newTsunagiGame(givens: string, size: number, options: TsunagiGameOptions = {}): TsunagiGame | null {
  const layout = decodeLayout(givens, size);
  if (layout === null) return null;
  const explosions = options.explosions ?? "on";
  const played = { ...layout, explosions: explosionsAsChosen(layout.explosions, explosions) };
  const lines = options.lines ?? noLines(layout);
  return {
    layout: played,
    givens,
    answer: options.answer ?? null,
    lines,
    undo: [],
    strokes: 0,
    drawing: null,
    before: null,
    reach: NO_REACH,
    flagged: null,
    blasted: null,
    exploded: null,
    checked: null,
    cheats: options.cheats === true,
    explosions,
    eased: layout.explosions === null || explosions === "on" ? null : explosions === "off" ? "explosions-off" : "explosions-soft",
    cheated: false,
    solved: isSolved(played, lines, options.answer ?? null),
  };
}

function isSolved(layout: LinkLayout, lines: Lines, answer: string | null): boolean {
  return allJoined(layout, lines) && (answer === null || answerOf(layout, lines) === answer);
}

/** Whether the game is out of strokes before it is solved: it takes nothing more until `restartGame`. */
export function outOfStrokes(game: TsunagiGame): boolean {
  return game.layout.strokes !== null && game.strokes >= game.layout.strokes && !game.solved;
}

/** Whether the game takes no more strokes: solved, or out of strokes. */
export function gameOver(game: TsunagiGame): boolean {
  return game.solved || outOfStrokes(game);
}

function shown(game: TsunagiGame, lines: Lines, more: Partial<TsunagiGame> = {}): TsunagiGame {
  return { ...game, lines, flagged: null, checked: null, ...more };
}

/** A finger down on a cell: starts a line from a marble, or carries on from a line's cell. Nothing where there is nothing to draw. */
export function pressGame(game: TsunagiGame, cell: number): TsunagiGame {
  if (gameOver(game) || game.drawing !== null) return game;
  const pressed = pressAt(game.layout, game.lines, cell);
  if (pressed.drawing === null) return game;
  return shown(game, pressed.lines, { drawing: pressed.drawing, before: game.lines, reach: NO_REACH, blasted: null, exploded: null });
}

/** The finger carried into a cell: the line grows, shortens or cuts another back, as the rules say. */
export function dragGame(game: TsunagiGame, cell: number): TsunagiGame {
  if (game.drawing === null) return game;
  const dragged = dragFinger(game.layout, game.lines, game.drawing, cell, game.reach);
  return dragged.lines === game.lines && dragged.reach === game.reach ? game : shown(game, dragged.lines, { reach: dragged.reach });
}

/** The finger lifted: the stroke is counted if it changed the board, the board may be solved, and an explosion may go off. */
export function liftGame(game: TsunagiGame): TsunagiGame {
  if (game.drawing === null) return game;
  const lines = letGo(game.lines, game.layout);
  const was = game.before;
  const ended = { ...game, lines, drawing: null, before: null, reach: NO_REACH };
  if (was === null || JSON.stringify(was) === JSON.stringify(lines)) return ended;
  const strokes = game.strokes + 1;
  if (isSolved(game.layout, lines, game.answer)) return { ...ended, strokes, solved: true };
  const blown = explosionAfter(game.layout, game.givens, lines, strokes);
  if (blown === null) return { ...ended, strokes, undo: [...game.undo.slice(-(UNDO_MOST - 1)), was] };
  return { ...ended, strokes, lines: blown.lines, undo: [], blasted: blown.cells, exploded: blown.hit.length > 1 ? "blast" : "boom" };
}

/** Undo: the lines as they were before the last stroke. Nothing once the game is over. */
export function undoGame(game: TsunagiGame): TsunagiGame {
  if (gameOver(game) || game.drawing !== null || game.undo.length === 0) return game;
  const lines = game.undo[game.undo.length - 1]!;
  return shown(game, lines, { undo: game.undo.slice(0, -1), blasted: null, exploded: null, solved: isSolved(game.layout, lines, game.answer) });
}

/** Restart: every line cleared and the strokes counted again (Undo can bring the lines back). A game that is solved or out of strokes restarts too. */
export function restartGame(game: TsunagiGame): TsunagiGame {
  if (game.drawing !== null || game.lines.every((line) => line.length === 0)) return game;
  return shown(game, noLines(game.layout), { undo: [...game.undo.slice(-(UNDO_MOST - 1)), game.lines], strokes: 0, blasted: null, exploded: null, cheated: false, solved: false });
}

/** Check: the pairs not joined yet are flagged, and how many cells are still empty is said. */
export function checkGame(game: TsunagiGame): TsunagiGame {
  if (gameOver(game) || game.drawing !== null) return game;
  const filledNow = filled(game.layout, game.lines);
  return { ...game, flagged: unjoinedPairs(game.layout, game.lines), checked: { unjoined: unjoinedPairs(game.layout, game.lines).length, empty: filledNow.of - filledNow.done } };
}

/**
 * Cheat: one unfinished line drawn as the answer has it, anything in its way cut back. It spends no stroke, and the
 * game is `helped` ever after. Nothing unless the game was made with `cheats` and an `answer`.
 */
export function cheatGame(game: TsunagiGame): TsunagiGame {
  if (!game.cheats || game.answer === null || gameOver(game) || game.drawing !== null) return game;
  const answerLines = linesOfAnswer(game.layout, game.answer);
  if (answerLines === null) return game;
  const drawn = cheatLine(game.layout, game.lines, answerLines);
  if (drawn === null) return game;
  const solved = isSolved(game.layout, drawn.lines, game.answer);
  return shown(game, drawn.lines, { undo: [...game.undo.slice(-(UNDO_MOST - 1)), game.lines], cheated: true, solved, blasted: null, exploded: null });
}

/** The help a game has used so far, the one that costs more where it used two; null for none. */
export function helpOf(game: TsunagiGame): TsunagiHelp | null {
  return strongestTsunagiHelp([game.cheated ? "cheated" : null, game.eased]);
}

/** Of several helps, the one a solve is kept with: explosions off, then Cheat, then explosions softened. */
export function strongestTsunagiHelp(helps: readonly (TsunagiHelp | null)[]): TsunagiHelp | null {
  for (const help of ["explosions-off", "cheated", "explosions-soft"] as const) if (helps.includes(help)) return help;
  return null;
}

/** Whether a solve with this help (or none) opens what a solve opens: every help but explosions off, whose block's lesson was not played. */
export function helpOpensNext(help: TsunagiHelp | null): boolean {
  return help !== "explosions-off";
}

/** What a game stands at: for a status line under the board. */
export type TsunagiProgress = {
  pairs: number;
  joined: number;
  /** Cells with a line through them, and cells there are to fill. */
  filled: number;
  cells: number;
  /** Strokes left of a limit, or null for no limit. */
  strokesLeft: number | null;
  strokeLimit: number | null;
  /** Strokes to the next explosion (1 means the next stroke), or null for a board without them. */
  boomIn: number | null;
  strokes: number;
  solved: boolean;
  outOfStrokes: boolean;
  helped: TsunagiHelp | null;
};

export function tsunagiProgress(game: TsunagiGame): TsunagiProgress {
  const cover = filled(game.layout, game.lines);
  const limit = game.layout.strokes;
  return {
    pairs: game.layout.ends.length,
    joined: game.layout.ends.filter((_, pair) => joined(game.layout, game.lines, pair)).length,
    filled: cover.done,
    cells: cover.of,
    strokesLeft: limit === null ? null : Math.max(0, limit - game.strokes),
    strokeLimit: limit,
    boomIn: strokesToExplosion(game.layout, game.strokes),
    strokes: game.strokes,
    solved: game.solved,
    outOfStrokes: outOfStrokes(game),
    helped: helpOf(game),
  };
}
