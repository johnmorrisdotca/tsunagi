---
title: Play strokes and retain progress
section: how-to
order: 3
description: Learn play strokes and retain progress.
---

## Use native press, drag and lift

newTsunagiGame decodes the board, returning null for invalid input. pressGame selects a line, dragGame moves along native legal steps, and liftGame closes the stroke. Keep each returned game. A stroke counts when lifting changed the board, not for every pointer sample.

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {newTsunagiGame,linesOfAnswer,pressGame,dragGame,liftGame,tsunagiProgress} from "@johnmorrisdotca/tsunagi";
const [givens,answer] = TSUNAGI_4[0];
let game = newTsunagiGame(givens,4,{answer})!;
const path = linesOfAnswer(game.layout,answer)![0];
game = pressGame(game,path[0]);
for (const cell of path.slice(1)) game = dragGame(game,cell);
game = liftGame(game);
console.log(tsunagiProgress(game).joined,game.strokes);
```

## Undo, limits and explosions

Undo restores lines without refunding spent strokes. An explosion breaks a line and clears its undo; the stroke that solves the board does not explode. A game out of strokes refuses further drawing until restart. Read gameOver/outOfStrokes and tsunagiProgress instead of maintaining parallel counters.

## Resume lines against the same board

encodeLines/decodeLines carry native line progress and verify it against the layout. Invalid progress returns null. They preserve bridges and portals through native stepping, so a list of visible SVG points is not a substitute. [Codes](codes-and-twists.md) explains the data model.
