---
title: TypeScript と Node
section: how-to
order: 15
description: パッケージの型を使い、DOM のないサーバーでルールを動かします。
---

パッケージには、入口ごとの型が付いています。ルールは文字列と数を扱うふつうの関数なので、Node・Deno・Bun・ワーカー・ブラウザーのどれでも同じ呼び出しが同じ答えを返します。このファイルは型を検査してから、型を取り除く Node 22.18 以降で動かしています。

```ts
import { checkTsunagiAnswer, type TsunagiCheck } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const [givens, answer] = TSUNAGI_6[11]!; // level 12
const check: TsunagiCheck = checkTsunagiAnswer(6, givens, answer);
console.log(check.ok, TSUNAGI_6.length);

// @ts-expect-error a list of levels is not a number
const wrong: number = TSUNAGI_6;
console.log(typeof wrong);
```

`@ts-expect-error` は、間違った型をコンパイラーが断ることを示すためにあります。

## サーバーで

サーバーに DOM は要りません。プレイヤーが送ってきたものを、同じルールで確かめます。

```mjs
// A server checks an answer with the same rules the board plays by: pure functions, no DOM, no browser globals.
import { checkTsunagiAnswer, dailyTsunagiLevel } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const today = dailyTsunagiLevel(6, new Date()); // the level of the day at 6×6: 1 to 256
const [givens, answer] = TSUNAGI_6[today - 1]; // send givens to the browser; keep the answer
console.log(checkTsunagiAnswer(6, givens, answer), TSUNAGI_6.length); // { ok: true } 256
```

ページに盤を載せる方法は [はじめに](getting-started.md) にあります。
