---
title: 線の操作と進行の保存
section: how-to
order: 3
description: 線の操作と進行の保存の使い方と注意点。
---

## 本来の押す・動かす・離す操作を使う

newTsunagiGameは不正な盤でnullを返します。pressGameで線を選び、dragGameで合法な進み方を使い、liftGameで操作を閉じます。戻り値を保存します。線を変えて離すと1回の操作になり、ポインターの各点を数えません。

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

## 戻す・制限・爆発

戻しても使った回数は返りません。爆発は線を壊して戻す履歴を消します。完成した操作では爆発しません。回数を使い切ると、再開するまで描けません。状態と進行の関数を読みます。

## 同じ盤に進行を戻す

線の保存は元の盤に対して確認し、不正ならnullです。橋やポータルも本来の進み方を使います。SVGの見える点だけでは保存の代わりになりません。[コード](codes-and-twists.md)を参照してください。
