---
title: 問題の読み込みと識別
section: how-to
order: 2
description: 問題の読み込みと識別の使い方と注意点。
---

## 大きさごとか、必要なときに読む

対応する大きさのエントリーに盤と解答の組があります。levelsでは必要な大きさを読みます。tsunagiLevelsOfやtsunagiLevelOfの前にloadTsunagiLevelsを待ちます。ポータルには別のセットがあります。

```ts
import {loadTsunagiLevels,tsunagiLevelOf} from "@johnmorrisdotca/tsunagi/levels";
const levels = await loadTsunagiLevels(4);
console.log(levels.length,tsunagiLevelOf(4,levels[0][0]));
```

## 解答を渡さずサーバーで確認する

layoutsは盤だけを大きさと問題順で持ちます。収録された盤か確認し、提出された解答を検証できます。ルールの確認と収録の確認は別です。難しさや学習の役割も小さい別のデータです。

## 番号とコードを保つ

記録に大きさ、セット、元の盤を残します。levelSeedはセットと番号の表現で、無作為の生成ではありません。番号を変えるときは対応表を保ちます。[移行](upgrading.md)を参照してください。
