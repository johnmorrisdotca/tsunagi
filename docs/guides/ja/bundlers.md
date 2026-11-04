---
title: Vite と webpack
section: how-to
order: 13
description: Vite や webpack のプロジェクトに、パッケージを入れて盤の要素を読み込みます。
---

まずインストールします。

```sh
npm install @johnmorrisdotca/tsunagi
# or: pnpm add @johnmorrisdotca/tsunagi
# or: yarn add @johnmorrisdotca/tsunagi
```

すべて ES モジュールで、入口ごとに分かれているので、バンドラーは読み込んだ分だけを残します。`@johnmorrisdotca/tsunagi/element/define` を読み込むと `<tsunagi-board>` のタグが1度だけ登録されます。

## Vite

ページです。

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tsunagi with Vite</title>
  </head>
  <body>
    <tsunagi-board grid="6" level="12"></tsunagi-board>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

スクリプトです。Vite は設定なしでこの入口をビルドできます。

```ts no-check
import "@johnmorrisdotca/tsunagi/element/define";

const board = document.querySelector("tsunagi-board")!;
board.addEventListener("tsunagi-solve", (event) => console.log((event as CustomEvent).detail.answer));
```

## webpack

入口です。タグを DOM で作るので、HTML は要りません。

```js no-check
import "@johnmorrisdotca/tsunagi/element/define";

const board = document.createElement("tsunagi-board");
board.setAttribute("grid", "6");
board.setAttribute("level", "12");
document.body.append(board);
```

設定です（webpack 5 は、パッケージの `exports` をそのまま読みます）。

```js no-check
import { fileURLToPath } from "node:url";

export default {
  mode: "production",
  entry: "./src/index.js",
  output: { path: fileURLToPath(new URL("./dist", import.meta.url)), filename: "main.js" },
};
```
