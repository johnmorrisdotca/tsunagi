# Keep a game half drawn, and come back to it

Lines have a short code, so a game can be kept in a database column or in a page's own storage, and carried on from it.

```ts
import { decodeLines, dragGame, encodeLines, liftGame, linesOfAnswer, newTsunagiGame, pressGame, tsunagiProgress } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_5 } from "@johnmorrisdotca/tsunagi/levels-5";

const [givens, answer] = TSUNAGI_5[0];
let game = newTsunagiGame(givens, 5, { answer })!;
const first = linesOfAnswer(game.layout, answer)![0];          // draw one pair, and stop
game = pressGame(game, first[0]);
for (const cell of first.slice(1)) game = dragGame(game, cell);
game = liftGame(game);

const code = encodeLines(game.layout, game.lines);             // a short string: keep it anywhere
const back = newTsunagiGame(givens, 5, { answer, lines: decodeLines(game.layout, code)! })!;
console.log(tsunagiProgress(back).joined === tsunagiProgress(game).joined, code.length); // true 25
```

The element and `mountTsunagi` hand the same code over in every event (`detail.code`) and take it back as `progress`, so a page keeps and resumes a game with one line each way.
