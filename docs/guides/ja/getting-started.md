---
title: はじめに
section: tutorial
order: 1
description: はじめにの使い方と注意点。
---

同じ印の2つを別々の線で結び、使えるマスをすべて埋めます。収録された問題、盤のコード、基本ルール、上限付きの解法、SVGと遊べる盤の機能があります。

## インストール

```sh
npm install @johnmorrisdotca/tsunagi
```

Node 22以降と新しいブラウザーで使える、型付きのESモジュールです。基本機能にDOMは不要です。必要な大きさの問題集だけを読み込めます。

## 収録された解答を確認する

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {decodeLayout,checkTsunagiAnswer} from "@johnmorrisdotca/tsunagi";
const [givens,answer] = TSUNAGI_4[0];
console.log(decodeLayout(givens,4)?.ends.length);
console.log(checkTsunagiAnswer(4,givens,answer));
```

公開の問題番号は1から、配列は0から始まります。checkTsunagiAnswerは線を確認しますが、渡した盤が収録問題かどうかは確認しません。提出された解答には元の盤を使います。

## 次の使い方

[問題集](load-levels.md)、[操作](play-and-strokes.md)、[表示と埋め込み](draw-and-embed.md)、[解法と生成](solve-and-generate.md)、[日替わり](daily-and-ladder.md)、[API](entry:main)へ進めます。
