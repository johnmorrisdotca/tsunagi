---
title: 日替わり・ブロック・補助
section: how-to
order: 6
description: 日替わり・ブロック・補助の使い方と注意点。
---

## 同じUTCの日を選ぶ

```ts
import {dailyTsunagiLevel,tsunagiDay,blockOf,tsunagiMarks} from "@johnmorrisdotca/tsunagi";
const day = tsunagiDay("2026-10-12");
const level = dailyTsunagiLevel(4,day);
console.log(day,level,level === null ? null : blockOf(level));
console.log(level === null ? null : tsunagiMarks(4,level));
```

日替わりは基本セットから固定の盤を選び、無作為に作り直しません。同じ大きさと日で同じ盤になります。対応しない大きさはnullです。過去の問題は日付の文字列を残します。

## 本来の進行を読む

16問ごとのブロックです。前のブロックを終えると次が開き、最初の未完成を選ぶ関数があります。15、16問目は特殊ルールの紹介や確認になる場合があります。難しさと役割は解答を読まず取得できます。

## 補助を正しく記録する

補助の種類はcheated、explosions-soft、explosions-offです。複数の記録をまとめる関数と、進行に数えるかの関数を使います。Checkは未完成の組を示し、Cheatには設定と解答が必要です。保存するとき補助の印を消しません。
