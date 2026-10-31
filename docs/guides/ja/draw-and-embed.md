---
title: 盤の表示と埋め込み
section: how-to
order: 4
description: 盤をSVGで描き、遊べる盤を置き、埋め込みの仕様を守ります。
---

## 配置せずSVGを作る

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {drawTsunagiCode} from "@johnmorrisdotca/tsunagi/draw";
const svg = drawTsunagiCode(TSUNAGI_4[0][0],4,{marks:"numbers",coordinates:true});
console.log(svg.startsWith("<svg"));
```

描画用エントリーはSVG文字列を返します。配色、盤、色か番号、丸か線、座標、強調表示を選べます。位置の関数はマスと点を変換し、盤外ではnullになります。

## 自前の盤の上に重ねる

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {decodeLayout} from "@johnmorrisdotca/tsunagi";
import {cellAtPoint,tsunagiDrawing,tsunagiGeometry} from "@johnmorrisdotca/tsunagi/draw";
const layout = decodeLayout(TSUNAGI_4[0][0],4)!;
const drawing = tsunagiDrawing(layout,{surface:true});
const geometry = tsunagiGeometry(layout,{surface:true});
console.log(drawing.attributes.viewBox,cellAtPoint(geometry,50,50));
```

`surface: true` を指定すると、枠・紙・座標を描かず、図の範囲がちょうどマス目だけになります。`tsunagiDrawing` は `drawTsunagi` と同じ図を、キー付きのグループに分けて返すので、フレームワークは一手で変わったグループだけを書き換えられます。`cellAtPoint` は、図を配置したのと同じ計算で、指の下のマスを求めます。

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
