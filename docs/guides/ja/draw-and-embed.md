---
title: 盤の表示と埋め込み
section: how-to
order: 4
description: 盤の表示と埋め込みの使い方と注意点。
---

## 配置せずSVGを作る

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {drawTsunagiCode} from "@johnmorrisdotca/tsunagi/draw";
const svg = drawTsunagiCode(TSUNAGI_4[0][0],4,{marks:"numbers",coordinates:true});
console.log(svg.startsWith("<svg"));
```

描画用エントリーはSVG文字列を返します。配色、盤、色か番号、丸か線、座標、強調表示を選べます。位置の関数はマスと点を変換し、盤外ではnullになります。

## 遊べる盤を置く

```ts no-run
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {mountTsunagi} from "@johnmorrisdotca/tsunagi/play";
const host = document.createElement("div");
document.body.append(host);
const [givens,answer] = TSUNAGI_4[0];
const board = mountTsunagi(host,{size:4,givens,answer,controls:true});
console.log(board?.progress().pairs);
board?.destroy();
```

ハンドルで問題、表示、戻す、再開、確認、補助、収める、解放を扱います。取り外すときはdestroyを呼びます。要素は登録用エントリーかdefineBoardを使います。

## 埋め込み仕様を保つ

ビルダーに要素、iframe、モジュール、フレームワークの例があります。gridは盤のマス数、sizeは反映される設定の表示サイズです。[仕様](../../embeds.md)に属性、取得値、イベント、メッセージがあります。フレームは保存領域を使いません。親で送信元を確認します。
