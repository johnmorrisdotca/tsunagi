import { strokesToExplosion } from "./explosions.ts";
import type { TsunagiGame, TsunagiHelp } from "./game.ts";
import { outOfStrokes } from "./game.ts";
import { filled, joined } from "./lines.ts";

/** The help a game has used so far, the one that costs more where it used two; null for none.
 *
 * @param game - The current immutable native puzzle state.
 * @returns The help a game has used so far, the one that costs more where it used two; null for none.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { helpOf, newTsunagiGame } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const game = newTsunagiGame(givens,4,{answer,cheats:true})!;
 * console.log(helpOf(game));
 * ```
 */
export function helpOf(game: TsunagiGame): TsunagiHelp | null {
  return strongestTsunagiHelp([game.cheated ? "cheated" : null, game.eased]);
}

/** Of several helps, the one a solve is kept with: explosions off, then Cheat, then explosions softened.
 *
 * @param helps - Assistance flags from the solves to combine.
 * @returns The most significant assistance flag, or null when all solves were unassisted.
 * @example
 * ```ts
 * import { strongestTsunagiHelp } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(strongestTsunagiHelp([null,"cheated","explosions-off"]));
 * ```
 */
export function strongestTsunagiHelp(helps: readonly (TsunagiHelp | null)[]): TsunagiHelp | null {
  for (const help of ["explosions-off", "cheated", "explosions-soft"] as const) if (helps.includes(help)) return help;
  return null;
}

/** Whether a solve with this help (or none) opens what a solve opens: every help but explosions off, whose block's lesson was not played.
 *
 * @param help - The solve’s assistance flag, or null for no help.
 * @returns Whether a solve with this help (or none) opens what a solve opens: every help but explosions off, whose block's lesson was not played.
 * @example
 * ```ts
 * import { helpOpensNext } from "@johnmorrisdotca/tsunagi";
 *
 * console.log(helpOpensNext("cheated"));
 * ```
 */
export function helpOpensNext(help: TsunagiHelp | null): boolean {
  return help !== "explosions-off";
}

/** What a game stands at: for a status line under the board.
 *
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { newTsunagiGame, tsunagiProgress } from "@johnmorrisdotca/tsunagi";
 * import type { TsunagiProgress } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const game = newTsunagiGame(givens,4,{answer,cheats:true})!;
 * const value: TsunagiProgress = tsunagiProgress(game);
 * console.log(value);
 * ```
 */
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

/** Read the native completion, strokes, explosions and help status of a game.
 *
 * @param game - The current immutable native puzzle state.
 * @returns Read the native completion, strokes, explosions and help status of a game.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { newTsunagiGame, tsunagiProgress } from "@johnmorrisdotca/tsunagi";
 *
 * const givens = TSUNAGI_4[0][0];
 * const answer = TSUNAGI_4[0][1];
 * const game = newTsunagiGame(givens,4,{answer,cheats:true})!;
 * console.log(tsunagiProgress(game));
 * ```
 */
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
