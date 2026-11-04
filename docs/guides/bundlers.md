---
title: Vite and webpack
section: how-to
order: 13
description: Install the package and import the board element in a Vite or webpack project.
---

Install it.

```sh
npm install @johnmorrisdotca/tsunagi
# or: pnpm add @johnmorrisdotca/tsunagi
# or: yarn add @johnmorrisdotca/tsunagi
```

Everything is an ES module with its own entry point, so a bundler keeps only what you import. `@johnmorrisdotca/tsunagi/element/define` registers the `<tsunagi-board>` tag once.

## Vite

The page.

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

The script. Vite builds this entry with no configuration.

```ts no-check
import "@johnmorrisdotca/tsunagi/element/define";

const board = document.querySelector("tsunagi-board")!;
board.addEventListener("tsunagi-solve", (event) => console.log((event as CustomEvent).detail.answer));
```

## webpack

The entry. It makes the tag with the DOM, so no HTML is needed.

```js no-check
import "@johnmorrisdotca/tsunagi/element/define";

const board = document.createElement("tsunagi-board");
board.setAttribute("grid", "6");
board.setAttribute("level", "12");
document.body.append(board);
```

The configuration (webpack 5 reads the package's `exports` with no help).

```js no-check
import { fileURLToPath } from "node:url";

export default {
  mode: "production",
  entry: "./src/index.js",
  output: { path: fileURLToPath(new URL("./dist", import.meta.url)), filename: "main.js" },
};
```
