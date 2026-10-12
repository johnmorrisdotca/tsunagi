---
title: 上限付きの解法と生成
section: how-to
order: 5
description: 上限付きの解法と生成の使い方と注意点。
---

## 証明と上限到達を分ける

countSolutionsは解の数、解、gaveUpを返します。一意と証明するには最大2個を探し、countが1でgaveUpがfalseと確認します。上限までに見つけた数だけでは証明になりません。既知の解で探索を助ける関数や、大きい盤用のSAT解法もあります。

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {decodeLayout,countSolutions} from "@johnmorrisdotca/tsunagi";
const result = countSolutions(decodeLayout(TSUNAGI_4[0][0],4)!,2,20000);
console.log(result.count,result.gaveUp,result.count === 1 && !result.gaveUp);
```

## 回数を決めて生成する

```ts no-run
import {candidate,seededRandom} from "@johnmorrisdotca/tsunagi";
const level = candidate(4,seededRandom(42),8,20000);
console.log(level?.layout ?? "No proved candidate in this attempt");
```

生成できない、または証明できない試行はnullです。修復、削減、少ない線、特殊ルールにはそれぞれ制約があります。ホストで再試行にも上限を置きます。

## 収録問題を保つ

新しい候補は収録された固定問題ではありません。変更には既存の生成手順を使い、証明、順番、移行を保ちます。この更新はコメントだけで、盤と解答は変えません。
