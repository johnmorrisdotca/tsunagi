# A game as pure functions

The rules of play are functions over plain values: each takes a game and returns a new one, so a server can replay a game's strokes, a test can play one, and a page of your own can draw the result.

```ts
import { dragGame, liftGame, linesOfAnswer, newTsunagiGame, pressGame, tsunagiProgress, undoGame } from "@johnmorrisdotca/tsunagi";
import type { TsunagiGame } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_5 } from "@johnmorrisdotca/tsunagi/levels-5";

/** One stroke: a finger down on the line's first cell, drawn along it, and let go. */
function stroke(game: TsunagiGame, line: readonly number[]): TsunagiGame {
  let next = pressGame(game, line[0]);
  for (const cell of line.slice(1)) next = dragGame(next, cell);
  return liftGame(next);
}

const [givens, answer] = TSUNAGI_5[0];
let game = newTsunagiGame(givens, 5, { answer })!;
const lines = linesOfAnswer(game.layout, answer)!;

game = stroke(game, lines[0]);
console.log(tsunagiProgress(game).joined);               // 1: one pair joined
console.log(tsunagiProgress(undoGame(game)).joined);     // 0: Undo takes the stroke back
for (const line of lines.slice(1)) game = stroke(game, line);
console.log(game.solved, tsunagiProgress(game).joined);  // true 6
console.log(undoGame(game).solved);                       // true: a solved game is over, and takes nothing back
```
