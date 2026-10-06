<h1 align="center">Tsunagi <sub>つなぎ</sub></h1>

<p align="center"><strong>A line-joining logic puzzle for JavaScript and TypeScript.</strong><br>
Join each pair of marbles with a line, every line its own, until the board is full. Layouts and answers as short codes, the rules a line keeps, a solver that counts answers, a seeded generator, walls, bridges, waypoints, portals and hexagon boards, a difficulty measure, and 2,368 levels from 4×4 to 30×30, and 256 more with portals, each proved to have exactly one answer. The board drawn as SVG, in colours or numbers, dots or lines, and played by touch and mouse in any page with one call or one tag. No dependencies.</p>

<p align="center">
  <a href="https://github.com/johnmorrisdotca/tsunagi/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/johnmorrisdotca/tsunagi/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/@johnmorrisdotca/tsunagi"><img alt="npm" src="https://img.shields.io/npm/v/@johnmorrisdotca/tsunagi?color=2f5d4a"></a>
  <a href="./LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-2f5d4a"></a>
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-0-2f5d4a">
</p>

<p align="center"><a href="https://johnmorrisdotca.github.io/tsunagi/"><strong>Play a level →</strong></a> · <a href="https://johnmorrisdotca.github.io/tsunagi/api.html">API reference</a></p>

<table align="center">
<tr>
<td align="center" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/hero-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/hero-desk-light.webp" alt="The demo on a desk: its header, the size and level choices, then a 7×7 board on green felt with five of seven pairs joined, the Undo, Restart and Check buttons and the line '5 of 7 joined · 73% of the board'" width="600">
</picture>
<br><em>The demo on a desk: a 7×7 level with five of its seven pairs joined.</em>
</td>
<td align="center" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/hero-phone-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/hero-phone-light.webp" alt="The demo on a phone, in Japanese: a 6×6 board on green felt with three of eight pairs joined, the three buttons, the progress line and the first of the settings" width="190">
</picture>
<br><em>On a phone, in Japanese, in the device's light or dark.</em>
</td>
</tr>
</table>

Tsunagi is the puzzle sometimes called Number Link, Arukone or Flow. It is
played at [itsutsu.com](https://itsutsu.com/games/tsunagi), which this package
was taken out of, and in [the demo](https://johnmorrisdotca.github.io/tsunagi/),
with nothing to install.

## In 30 seconds

```sh
npm install @johnmorrisdotca/tsunagi
```

```ts
import { allJoined, answerOf, checkTsunagiAnswer, decodeLayout, dragThrough, noLines, pressAt } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_5 } from "@johnmorrisdotca/tsunagi/levels-5";

const [givens, answer] = TSUNAGI_5[0];         // level 1 at 5×5: its layout and its one answer
const layout = decodeLayout(givens, 5)!;        // the marbles, walls, bridges and waypoints, as numbers

let lines = noLines(layout);                     // nothing drawn yet
({ lines } = pressAt(layout, lines, layout.ends[0][0]));   // a finger down on the first marble…
lines = dragThrough(layout, lines, 0, 5);        // …and drawn down a row to cell 5, as a line may go

allJoined(layout, lines);                        // has every pair been joined?
checkTsunagiAnswer(5, givens, answerOf(layout, lines));   // { ok: true } or { ok: false, reason }
```

And in a page, a level to play, by touch and mouse, with nothing else to set up:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@1/dist/element-define.js"></script>
<tsunagi-board size="6" level="3" marks="numbers" fill="lines" board="wood"></tsunagi-board>
```

## Who it is for

- **Puzzle sites and apps** that want Tsunagi with the rules already right:
  fixed levels everybody plays alike, a check a server can trust in O(cells),
  and the drawing a finger does (press, drag, let go) as pure functions.
- **Anyone making line puzzles of their own**, who wants a solver that counts
  answers, a generator that makes boards with exactly one, and the twists
  (walls, bridges, waypoints, a board that wraps, hexagons) to vary them.
- **Pages that just want the board**: it draws itself as SVG text (colours or
  numbers on the marbles, dots or lines, four colour sets, six boards), and
  plays itself in an element or one function call, with Undo, Restart, Check,
  Cheat, the zoom pad a big board needs, and its words in English and Japanese.

## Features

- **Levels everybody plays alike.** Thousands of fixed levels from 4×4 to 30×30 (see [Levels](#levels)), and a second set of boards with portals, each proved on every build to have exactly one answer, in blocks of sixteen that open one after another. A level keeps its number, so a time on it can be compared with anybody's.
- **A level of the day**, the same for everybody, from the date alone: `dailyTsunagiLevel(size, date)`. No server, no seed.
- **A check a server can trust.** `checkTsunagiAnswer` reads a finished answer in O(cells), with no search, and says the first thing wrong.
- **A solver that counts answers**, and a seeded generator that makes boards with exactly one, with the twists: walls, bridges, waypoints, wrap, portals, hexagons, few lines, explosions and a stroke limit.
- **Big boards, made by taking clues away.** A 30×30 board with one answer is not found by luck: `reducedCandidate` starts from a filling cut into short lines and joins them while the solver can still prove one answer, so a board comes out with a cheap proof by construction (a median 3 seconds at 20×20, 11 at 25×25 and 25 to 66 at 30×30, on one core of a desk, measured 2026-10-05). 20×20, 25×25 and 30×30 have 64 levels each; see [Making levels](docs/MAKING-LEVELS.md).
- **A difficulty measure**, so a level has a mark from 1 to 5 and the levels of a size run easiest first.
- **Drawn as SVG text**, in an entry of its own: colours or numbers on the marbles, dots or lines, four colour sets, six boards, bridges drawn as bridges. A server that only checks answers never loads it.
- **Played in any page** by touch and mouse, with Undo, Restart, Check, Cheat and the zoom pad a big board needs, as one function call (`mountTsunagi`) or one tag (`<tsunagi-board>`).
- **Games as short strings**: a layout, an answer, a game half drawn, each a code a database column can keep.
- **English and Japanese**, in the board's words and the demo.
- **No dependencies**, no network requests, no sound, and nothing stored outside the page it is in.

### What's in it

Every picture is a real board, drawn by the package, taken from [the demo](https://johnmorrisdotca.github.io/tsunagi/) in light and dark.

<table>
<tr>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/colours-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/colours-desk-light.webp" alt="A finished 7×7 level on paper, each pair joined by a line in its own colour" width="300">
</picture>
<br><em><strong>Colours and dots.</strong> Each pair has a colour, and its cells are washed in it. The default look; see <a href="#drawing-a-board">Drawing a board</a>.</em>
</td>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/numbers-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/numbers-desk-light.webp" alt="A finished 6×6 level on wood, each pair told by its number on a plain marble" width="300">
</picture>
<br><em><strong>Numbers and lines.</strong> <code>marks: "numbers"</code> and <code>fill: "lines"</code> tell the pairs apart without colour.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/colour-blind-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/colour-blind-desk-light.webp" alt="A finished 7×7 level on a black board with row and column marks, in the colour-blind colour set" width="300">
</picture>
<br><em><strong>A colour-blind set, coordinates.</strong> Four colour sets, six boards, and row and column marks for talking about a cell.</em>
</td>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/walls-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/walls-desk-light.webp" alt="A finished 6×6 level on green with a dark wall bar between two cells and a blocked square" width="300">
</picture>
<br><em><strong>Walls and blocked cells.</strong> A bar stops a line; a dark square is a cell no line may enter.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/bridges-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/bridges-desk-light.webp" alt="A finished 6×6 level on blue where one line crosses a bridge and another passes under it" width="300">
</picture>
<br><em><strong>Bridges.</strong> One line goes across, another goes down under it.</em>
</td>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/waypoints-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/waypoints-desk-light.webp" alt="A finished 6×6 level on paper with a waypoint ring in one pair's colour" width="300">
</picture>
<br><em><strong>Waypoints.</strong> A ring is a cell its pair's line must go through.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/wrap-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/wrap-desk-light.webp" alt="A finished 6×6 level on red whose edges join, with the far edge faded round it and a dashed rim" width="300">
</picture>
<br><em><strong>A board that wraps.</strong> A line leaving one side comes back on the opposite one.</em>
</td>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/hexagon-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/hexagon-desk-light.webp" alt="A finished 7×7 hexagon level on wood, made of six-sided cells" width="300">
</picture>
<br><em><strong>Hexagons.</strong> A honeycomb of six-sided cells, six ways round.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/portals-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/portals-desk-light.webp" alt="A finished 7×7 level with portals: two purple rings marked α, one where a line goes in and one where it comes out" width="300">
</picture>
<br><em><strong>Portals.</strong> A line that goes into one ring comes out of the other.</em>
</td>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/big-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/tsunagi/main/docs/images/big-desk-light.webp" alt="A finished 30×30 level drawn as lines only, dozens of coloured lines filling nine hundred cells" width="300">
</picture>
<br><em><strong>Big boards.</strong> Up to 30×30, each with one answer, played through a zoom and move pad.</em>
</td>
</tr>
</table>

## Use it in your project

Tsunagi is three things, each usable without the others: **the puzzle** (rules, solver, generator and levels, as plain functions over strings), **the drawing** (SVG text), and **the page** (a mounted board or a tag). The table under [Levels](#levels) says which entry holds which. The examples are at 6×6.

### Install

```sh
npm install @johnmorrisdotca/tsunagi
# or: pnpm add @johnmorrisdotca/tsunagi
# or: yarn add @johnmorrisdotca/tsunagi
```

It is ES modules only, with its types included, and needs Node 22 or later when it runs outside a browser. For a page with no bundler, the same files are on a CDN: `https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@1/dist/element-define.js` defines the `<tsunagi-board>` tag.

### 1. The API alone, on a server

```ts
import { checkTsunagiAnswer, dailyTsunagiLevel } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const today = dailyTsunagiLevel(6, new Date());   // the level of the day at 6×6: 1 to 256
const [givens, answer] = TSUNAGI_6[today! - 1];     // send `givens` to the browser; keep `answer`
const answerFromThePlayer = answer;                 // here it stands in for the text the player sent
console.log(checkTsunagiAnswer(6, givens, answerFromThePlayer)); // { ok: true } or { ok: false, reason }, in O(cells)
```

Importing the main entry on a server is safe: it touches no page.

### 2. One tag, no bundler

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@1/dist/element-define.js"></script>
<tsunagi-board size="6" level="3"></tsunagi-board>
<script>
  document.querySelector("tsunagi-board").addEventListener("tsunagi-solve", (event) => console.log(event.detail.answer));
</script>
```

### 3. A bundler, and a framework

`import "@johnmorrisdotca/tsunagi/element/define"` once, in code that runs in the browser, and `<tsunagi-board>` is a tag like any other. The tag draws itself in the page's own DOM, so the page's CSS reaches it. Its attributes are read again when they change, and it speaks through DOM events (`tsunagi-change`, `tsunagi-stroke`, `tsunagi-explosion`, `tsunagi-solve`) that carry a `detail`.

```jsx
// React 19
import { useEffect, useRef } from "react";
import "@johnmorrisdotca/tsunagi/element/define";

export function Level({ size, level, onSolved }) {
  const board = useRef(null);
  useEffect(() => {
    const listen = (event) => onSolved(event.detail.answer, event.detail.helped);
    board.current?.addEventListener("tsunagi-solve", listen);
    return () => board.current?.removeEventListener("tsunagi-solve", listen);
  }, [onSolved]);
  return <tsunagi-board ref={board} size={String(size)} level={String(level)} />;
}
```

```vue
<!-- Vue 3: tell the compiler the tag is not a Vue component -->
<script setup>
import "@johnmorrisdotca/tsunagi/element/define";
defineProps({ size: Number, level: Number });
</script>
<template>
  <tsunagi-board :size="size" :level="level" @tsunagi-solve="(event) => console.log(event.detail.answer)" />
</template>
<!-- in vite.config: vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith("tsunagi-") } } }) -->
```

```svelte
<!-- Svelte 5 -->
<script>
  import "@johnmorrisdotca/tsunagi/element/define";
  let { size, level } = $props();
  let board;
  $effect(() => {
    const listen = (event) => console.log(event.detail.answer);
    board.addEventListener("tsunagi-solve", listen);
    return () => board.removeEventListener("tsunagi-solve", listen);
  });
</script>
<tsunagi-board bind:this={board} size={size} level={level}></tsunagi-board>
```

```ts no-check
// Angular: a standalone component with CUSTOM_ELEMENTS_SCHEMA
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@johnmorrisdotca/tsunagi/element/define";

@Component({
  selector: "app-level",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<tsunagi-board size="6" level="3" (tsunagi-solve)="solved($event)"></tsunagi-board>`,
})
export class Level {
  solved(event: Event) { console.log((event as CustomEvent).detail.answer); }
}
```

In Next.js or any server-rendering framework, import the define entry from a client component, so the tag is defined in the browser. Or skip the tag and call `mountTsunagi(element, options)` from `@johnmorrisdotca/tsunagi/play` in an effect: the handle it returns has `destroy()`.

`pnpm test:frameworks` builds these recipes from the packed tarball for each of the five and plays a level to its end in Chromium and WebKit; it needs the network and a few minutes, so it runs before a release and in CI, not with `pnpm check`.

### What a developer gets

- **Typed results**, with a doc comment on every export. Every function is pure and returns new values.
- **No dependencies.** ES modules, an entry per concern, and `sideEffects` set so that only the define entry has an effect.

## Examples

Each example is a whole recipe: copy it, and it works. Each is run against the built package (`pnpm test:readme`), so none is a guess, and output is shown under it. The shorter ways in, and the React, Vue, Svelte and Angular recipes, are under [Use it in your project](#use-it-in-your-project).

### A page with nothing else

Save this as `level.html` and open it. One script, one tag, and a level to play, with the buttons, the words and a line under the board that says where the game stands.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>A Tsunagi level</title>
  </head>
  <body>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@1/dist/element-define.js"></script>
    <tsunagi-board size="7" level="12" marks="numbers" fill="lines" board="wood" chips cheats></tsunagi-board>
    <p id="said">Join every pair of marbles.</p>
    <script type="module">
      const board = document.querySelector("tsunagi-board");
      board.addEventListener("tsunagi-solve", (event) => {
        document.getElementById("said").textContent = event.detail.helped ? "Solved, with help." : "Solved on your own.";
      });
    </script>
  </body>
</html>
```

### Check an answer in Node

The check reads a finished answer in O(cells), with no search, and says the first thing that is wrong.

```ts
import { checkTsunagiAnswer, decodeLayout } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_5 } from "@johnmorrisdotca/tsunagi/levels-5";

const [givens, answer] = TSUNAGI_5[0];                       // level 1 at 5×5: its layout and its one answer
console.log(checkTsunagiAnswer(5, givens, answer));          // { ok: true }
console.log(checkTsunagiAnswer(5, givens, "x".repeat(25)));  // { ok: false, reason: 'a cell has no line through it' }
console.log(decodeLayout(givens, 5)?.ends);                  // each pair's two marbles, by cell number
```

```text
{ ok: true }
{ ok: false, reason: 'a cell has no line through it' }
[ [ 0, 15 ], [ 1, 4 ], [ 6, 20 ], [ 7, 23 ], [ 8, 18 ], [ 9, 24 ] ]
```

### A server that keeps no answers

A server that checks a solve, or lists who solved which level, needs a level's board and nothing more: the player sends an answer, and the check says whether it is one. The `layouts` entry holds every board without its answer, at about a third of the bytes of the levels.

```ts
import { checkTsunagiAnswer } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_LAYOUTS } from "@johnmorrisdotca/tsunagi/layouts";

/** Is `submitted` a solve of level `level` at `size`? Nothing is stored but the boards. */
function isSolve(size: number, level: number, submitted: string): boolean {
  const givens = TSUNAGI_LAYOUTS[size]?.[level - 1];
  return givens !== undefined && checkTsunagiAnswer(size, givens, submitted).ok;
}

console.log(isSolve(5, 1, "ABBBBACDEFACDEFACDEFCCDDF")); // true
console.log(isSolve(5, 1, "ABBBBACDEFACDEFACDEFCCDDD")); // false
console.log(isSolve(5, 9999, "anything"));               // false: there is no such level
```

### Today's level, from the date alone

Today's level is a pure function of the date and the size, the same for everybody, with no seed to share and no server to ask.

```ts
import { dailyTsunagiLevel, tsunagiDay } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_7 } from "@johnmorrisdotca/tsunagi/levels-7";

const day = tsunagiDay(new Date("2026-10-01T23:30:00Z"));  // "2026-10-01": a day is counted in UTC
const level = dailyTsunagiLevel(7, day)!;                  // 121
const [givens] = TSUNAGI_7[level - 1];
console.log(day, level, givens.length);                    // 2026-10-01 121 …
```

### Draw a board as SVG text

`drawTsunagi` returns text, so a board can go in a page, a file, an email or an image, and a server can draw one with no page at all.

```ts
import { decodeLayout, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
import { drawTsunagi } from "@johnmorrisdotca/tsunagi/draw";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const [givens, answer] = TSUNAGI_6[2];
const layout = decodeLayout(givens, 6)!;
const svg = drawTsunagi(layout, { lines: linesOfAnswer(layout, answer)!, marks: "numbers", fill: "lines", board: "wood", style: true });
console.log(svg.startsWith("<svg"), svg.includes("tsu-line"));  // true true
```

`style: true` puts the drawing's style inside it, so the text stands alone as an image. Written to a file it is a picture anyone can open:

```js
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeLayout, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
import { drawTsunagiCode } from "@johnmorrisdotca/tsunagi/draw";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const [givens, answer] = TSUNAGI_6[2];
const lines = linesOfAnswer(decodeLayout(givens, 6), answer);
const file = join(tmpdir(), "tsunagi-level-3.svg");
writeFileSync(file, drawTsunagiCode(givens, 6, { lines, style: true, board: "green" }));
console.log("wrote", file.endsWith(".svg"));
```

### A look of your own

A board is a look of colours, and a colour set is a list of `[hue, saturation, lightness]`, used round and round. Each colour is also a custom property on `.tsunagi`, so a page can change a single one with CSS instead.

```ts
import { decodeLayout, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
import { drawTsunagi, TSUNAGI_BOARDS, TSUNAGI_COLOUR_SET_NAMES } from "@johnmorrisdotca/tsunagi/draw";
import { TSUNAGI_7 } from "@johnmorrisdotca/tsunagi/levels-7";

const [givens, answer] = TSUNAGI_7[0];
const layout = decodeLayout(givens, 7)!;
const svg = drawTsunagi(layout, {
  lines: linesOfAnswer(layout, answer)!,
  board: { paper: ["#f6efe0", "#e8dcc0"], frame: "#7a5b2e", grid: "#bfae8a", ink: "#2b2118", coordinate: "#5b3d1c" },
  colours: [[12, 80, 52], [200, 70, 50], [48, 90, 55], [320, 60, 55]],
  coordinates: true,
});
console.log(Object.keys(TSUNAGI_BOARDS), TSUNAGI_COLOUR_SET_NAMES);
console.log(svg.includes("tsu-coordinate"));
```

```css
/* or change one colour for every board on the page */
tsunagi-board, .tsunagi { --tsu-ink: #2b2118; --tsu-frame: #7a5b2e; }
```

### A game as pure functions

The rules of play are functions over plain values: each takes a game and returns a new one, so a server can replay a game's strokes, a test can play one, and a page of your own can draw the result.

```ts
import { dragGame, liftGame, linesOfAnswer, newTsunagiGame, pressGame, tsunagiProgress, undoGame } from "@johnmorrisdotca/tsunagi";
import type { TsunagiGame } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_5 } from "@johnmorrisdotca/tsunagi/levels-5";

/** One stroke: a finger down on the line's first cell, drawn along it, and let go. */
function stroke(game: TsunagiGame, line: readonly number[]): TsunagiGame {
  let next = pressGame(game, line[0]);
  for (const cell of line.slice(1)) next = dragGame(next, cell);
  return liftGame(next);
}

const [givens, answer] = TSUNAGI_5[0];
let game = newTsunagiGame(givens, 5, { answer })!;
const lines = linesOfAnswer(game.layout, answer)!;

game = stroke(game, lines[0]);
console.log(tsunagiProgress(game).joined);               // 1: one pair joined
console.log(tsunagiProgress(undoGame(game)).joined);     // 0: Undo takes the stroke back
for (const line of lines.slice(1)) game = stroke(game, line);
console.log(game.solved, tsunagiProgress(game).joined);  // true 6
console.log(undoGame(game).solved);                       // true: a solved game is over, and takes nothing back
```

### Keep a game half drawn, and come back to it

Lines have a short code, so a game can be kept in a database column or in a page's own storage, and carried on from it.

```ts
import { decodeLines, dragGame, encodeLines, liftGame, linesOfAnswer, newTsunagiGame, pressGame, tsunagiProgress } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_5 } from "@johnmorrisdotca/tsunagi/levels-5";

const [givens, answer] = TSUNAGI_5[0];
let game = newTsunagiGame(givens, 5, { answer })!;
const first = linesOfAnswer(game.layout, answer)![0];          // draw one pair, and stop
game = pressGame(game, first[0]);
for (const cell of first.slice(1)) game = dragGame(game, cell);
game = liftGame(game);

const code = encodeLines(game.layout, game.lines);             // a short string: keep it anywhere
const back = newTsunagiGame(givens, 5, { answer, lines: decodeLines(game.layout, code)! })!;
console.log(tsunagiProgress(back).joined === tsunagiProgress(game).joined, code.length); // true 25
```

The element and `mountTsunagi` hand the same code over in every event (`detail.code`) and take it back as `progress`, so a page keeps and resumes a game with one line each way.

### Listen to the board

The element speaks through DOM events that carry a `detail`: `tsunagi-change` after every stroke, `tsunagi-stroke`, `tsunagi-explosion` and `tsunagi-solve`.

```ts no-run
type Solve = { answer: string; helped: "cheated" | "explosions-soft" | "explosions-off" | null };

const board = document.querySelector("tsunagi-board")!;
board.addEventListener("tsunagi-change", (event) => {
  const { code, progress } = (event as CustomEvent).detail;   // `code` keeps the game; `progress` says where it stands
  localStorage.setItem("level-12", code);
  console.log(progress);
});
board.addEventListener("tsunagi-solve", (event) => {
  const { answer, helped } = (event as CustomEvent<Solve>).detail;
  fetch("/solves", { method: "POST", body: JSON.stringify({ level: 12, answer, helped }) });
});
```

### Count a board's answers

The solver counts answers up to a limit, so a board's single answer is proved and a loose board is told apart from it. A level in this package has exactly one.

```ts
import { countSolutions, decodeLayout } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_5 } from "@johnmorrisdotca/tsunagi/levels-5";

const level = decodeLayout(TSUNAGI_5[0][0], 5)!;
console.log(countSolutions(level, 2).count);                  // 1: one answer, as every level has

const loose = decodeLayout("A..A............", 4)!;            // two marbles at opposite corners, nothing else
console.log(countSolutions(loose, 2).count);                  // 2: at least two, and the count stops at the limit
```

### Make a board from a seed

A generator makes boards the same way every time for a seed: lay lines at random, cut them back to their ends, and keep the board if the solver finds exactly one answer.

```ts
import { candidate, checkTsunagiAnswer, seededRandom } from "@johnmorrisdotca/tsunagi";

const random = seededRandom(7);
let made = null;
for (let tries = 0; tries < 500 && made === null; tries += 1) made = candidate(5, random, 8, 100_000);
console.log(made?.layout, made?.answer, made?.pairs);        // AB.BC..D..E.....EA..D...C ABBBCAADDCEAADCEEADCDDDDC 5
console.log(made && checkTsunagiAnswer(5, made.layout, made.answer).ok); // true
```

A board made this way is not a published level. Published levels are fixed, so that a time on one can be compared with anybody's; a generator is for a board of the day of your own, a practice mode, or a test.

### Which levels are open, and how hard each is

Levels come in blocks of sixteen, and a block opens when every level of the one before is solved. The ladder is a pure function of what a player has solved.

```ts
import { levelCountOf, nextTsunagiLevel, openTsunagiLevels, tsunagiMarks } from "@johnmorrisdotca/tsunagi";

const solved = new Set([1, 2, 3]);
console.log(openTsunagiLevels(7, solved));   // 16: the first block is open from the start
console.log(levelCountOf(7, "classic"));     // 256
console.log(levelCountOf(7, "portals"));     // 32
console.log(tsunagiMarks(7, 12));            // 1 to 5: how hard level 12 at 7×7 is
console.log(nextTsunagiLevel(7, solved));    // the level to offer next
```

### Load the levels with portals

The second set of levels is boards with portals, loaded by size like the first.

```ts
import { challengesOf, decodeLayout, levelCountOf } from "@johnmorrisdotca/tsunagi";
import { loadTsunagiLevels } from "@johnmorrisdotca/tsunagi/levels";

const levels = await loadTsunagiLevels(7, "portals");          // only 7×7's portal levels are fetched
const [givens] = levels[0];
const layout = decodeLayout(givens, 7)!;
console.log(levels.length, levelCountOf(7, "portals"));        // 32 32
console.log(layout.portalPairs.length, challengesOf(givens));  // the portals this board has, and what it asks of a player
```

## The puzzle

Each letter in a layout is a marble, and each marble has one partner. A line
joins the two, stepping from cell to cell, never crossing another line, and
when every pair is joined every cell is filled. A level has exactly one answer.

- **Walls** between two cells, and **blocked** cells, that no line may pass.
- **Bridges**, crossed straight across by one line and straight down by
  another.
- **Waypoints**, a cell a pair's own line must pass through.
- **Wrap**, a board whose edges join, so a line leaving one side comes back
  on the other.
- **Portals**, pairs of rings inside the board: a line that goes into one comes
  out of the other, going the same way, and both rings are cells it fills. Each
  portal is gone through by exactly one line, once.
- **Hexagons**, a board of six-sided cells, six ways round.
- **Sparse** boards, with fewer marbles and more room, and **explosions** and
  **strokes**, a limit on how a board may be drawn.

## Drawing a board

```ts
import { decodeLayout, linesOfAnswer } from "@johnmorrisdotca/tsunagi";
import { drawTsunagi, TSUNAGI_STYLE } from "@johnmorrisdotca/tsunagi/draw";
import { TSUNAGI_7 } from "@johnmorrisdotca/tsunagi/levels-7";

const [givens, answer] = TSUNAGI_7[0];
const layout = decodeLayout(givens, 7)!;
const svg = drawTsunagi(layout, { lines: linesOfAnswer(layout, answer)!, marks: "numbers", fill: "lines", board: "wood" });
```

`drawTsunagi` returns SVG text: put it in a page, a file or an image, with nothing
to load. It draws what itsutsu.com draws. Marbles on a board; each line a thick
rounded stroke through its cells' middles; every cell a line runs through
washed faintly in its colour and, with `fill: "marbles"`, holding a small marble
too, so a finished board is a board of marbles joined by their lines. Walls are
bars on the edge between two cells and blocked cells are dark squares. A
**bridge** is drawn as a bridge: the line going down passes *under* its deck and
is lost beneath it, and the line going across is drawn over the deck. A
**waypoint** is a ring in its line's colour. A **portal** is two rings alike, in a colour
and with a letter (α, β, …) of their own, and the line is seen to stop just inside the one
it goes into and start again just inside the other, going on the way it went in; a faint link
between the two shows when the pointer is over one (`data-linked="true"` on the portal's
group shows it too, which is what a tap does). A board that **wraps** has a faded
ghost of the far edge all round it and a dashed rim, and a line across the join
leaves by one edge and comes in by the other. A **hexagon** is a honeycomb of
hexagons, in the same square box as every board.

| Option | Values | What it does |
| --- | --- | --- |
| `lines` | `Lines` | the lines drawn so far; none, if left out |
| `marks` | `colours` (default), `numbers` | tell the pairs apart by colour, or by the pair's number on a plain shell marble with every line in a soft tint |
| `fill` | `marbles` (default), `lines` | a small marble (the dots) in every cell a line runs through, or the line alone |
| `colours` | `marble` (default), `bright`, `colour-blind`, `soft`, or your own `[hue, saturation, lightness][]` | each pair's colour: each set has one for all eighty-two pairs, its first sixteen the ones boards to 15×15 are drawn in and then the same hues turned round the wheel and made lighter or darker; a set of your own is used round and round |
| `board` | `paper` (default), `wood`, `green`, `blue`, `red`, `black`, or a `TsunagiBoardLook` | the paper, the frame, the rules and the ink of walls and bridges; `paper` takes its colours from the page's light or dark |
| `coordinates` | boolean | row numbers and column letters down the sides (not on a board that wraps or a hexagon) |
| `ghosts` | boolean, default true | the ghost of the far edge round a board that wraps |
| `flagged` | pairs | the marbles of these pairs flash: what Check found not joined |
| `blasted` | cells | each bursts: where an explosion took a line out |
| `done` | boolean | a faint wash of green, and `data-solved="true"` |
| `language` | `en` (default), `ja` | what a screen reader hears |
| `label`, `style`, `id` | | a description instead of the size; `style: true` puts `TSUNAGI_STYLE` inside so the drawing stands alone as an image; the prefix of the ids in the drawing, made from the drawing itself if left out so two never share one |

A custom board is a look of colours: `{ paper: "#fbf8f1" | ["#f0cf95", "#d3a662"], frame, grid, ink, coordinate }`, and every colour is also a custom property on `.tsunagi` (see [Theming](#theming)). The parts of the drawing carry classes and data attributes (`tsu-marble`, `tsu-line`, `tsu-wall`, `tsu-bridge`, `tsu-portal` and the rest) to style or find them, and a drawing is made of groups a page can redraw one pair at a time, so a finger moving through a cell redraws one or two pairs and not the whole of a 30×30 board. `drawTsunagiCode(givens, size, options)` draws a level from its code, `drawTsunagiMarble(pair, options)` one marble for a legend, and `tsunagiGeometry(layout)` and `cellAtPoint(geometry, x, y)` say where every cell is and which cell a point is over. All the classes, the groups and the measurements are in [docs/DRAWING.md](docs/DRAWING.md). Nothing in the drawing can be selected, dragged or double-tapped into a selection, and with reduced motion asked for nothing moves.

## Playing it in a page

```ts no-run
import { mountTsunagi } from "@johnmorrisdotca/tsunagi/play";
import { TSUNAGI_7 } from "@johnmorrisdotca/tsunagi/levels-7";

const [givens, answer] = TSUNAGI_7[11];
const [other, otherAnswer] = TSUNAGI_7[12];
const send = (answer: string, helped: string | null) => fetch("/solves", { method: "POST", body: JSON.stringify({ answer, helped }) });

const board = mountTsunagi(document.getElementById("here")!, {
  size: 7, givens, answer, level: 12,         // a level; `level` shows its difficulty and its place in its block
  marks: "numbers", fill: "lines", colours: "colour-blind", board: "wood",
  cheats: true, explosions: "soft", chips: true,
  onSolve: ({ answer, helped }) => send(answer, helped),   // `answer` is what checkTsunagiAnswer takes
});
board?.undo(); board?.check(); board?.load({ size: 7, givens: other, answer: otherAnswer });
```

It plays the way the site does: press a marble (or the end of a line) and drag to its partner; drag back over a line to shorten it; tap a marble to clear its line; a line dragged into another cuts the other back, and a drag goes through a portal and comes out of the other ring. A big board (10×10 up) is looked at through a box with a zoom and move pad. Under the board are **Undo**, **Restart**, **Check** and, if `cheats` is on and the level has an `answer`, **Cheat**, then a line of progress and the lines a level's twists ask for. Everything a button does is also a method on the handle (`undo`, `restart`, `check`, `cheat`, `fit`, `load`, `set`, `destroy`). How a drag is read (pointer events, `dragFinger` and `Reach` through a portal), what the zoom pad does, and what each line under the board says are in [docs/PLAYING.md](docs/PLAYING.md).

| Option | What it does |
| --- | --- |
| `size`, `givens`, `answer`, `level`, `set` | the level (`set`: `classic`, the default, or `portals`); `answer` is needed for Cheat and makes a solve the stored answer |
| `lines` | lines to start from: a kept game (`decodeLines`) or a solved board to show |
| `marks`, `fill`, `colours`, `board`, `coordinates` | the look, as for `drawTsunagi`; change them with `set` and they take effect at once |
| `explosions` | `on` (default), `soft` (a boom for a blast, half as often) or `off`; a solve with either help is `helped` |
| `cheats` | offer Cheat |
| `controls`, `chips`, `zoom` | the buttons and words (default on), the chips (default off), and the pad: `auto` from 10×10, `on`, `off` |
| `language` | `en` or `ja`; left out, the host's `lang` or the page's, and it follows the page's |
| `onChange`, `onStroke`, `onExplosion`, `onSolve` | callbacks, and the same four as DOM events on the host: `tsunagi-change`, `tsunagi-stroke`, `tsunagi-explosion`, `tsunagi-solve`. Each `detail` has `lines`, `code` (to keep the game), `progress`, `answer` and `helped` |

Ctrl or Cmd with Z undoes. The rules are `game.ts`'s, which are pure and need no
page, so a server can replay a game's strokes.

### The element

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@1/dist/element-define.js"></script>
<tsunagi-board size="6" level="3"></tsunagi-board>
<tsunagi-board size="5" givens=".A..." answer="..." marks="numbers" fill="lines" colour-set="soft" board="green" coordinates cheats chips></tsunagi-board>
```

Or `import "@johnmorrisdotca/tsunagi/element/define"` in a bundle. Attributes, each read again
when it changes: `size` with `level` (the package's own levels, fetched when asked; `set="portals"` for the ones with portals) or with `givens` and
`answer`; `marks` (`colours` or `numbers`); `fill` (`marbles` or `lines`); `colour-set` (`marble`,
`bright`, `colour-blind`, `soft`); `board` (`paper`, `wood`, `green`, `blue`, `red`, `black`);
`coordinates`; `explosions` (`on`, `soft`, `off`); `cheats`; `controls="off"`; `chips`; `zoom`;
`progress` (a `code` from an event, to carry on a kept game); `lang`. A look changes at once
without starting a new game; the level, `explosions` and `cheats` start it again. It fires the four
events above and has the methods `undo()`, `restart()`, `check()`, `cheat()` and `fit()`.
Importing either entry on a server is safe.

## Levels

```ts
import { loadTsunagiLevels, openTsunagiLevels, TSUNAGI_LEVEL_COUNTS } from "@johnmorrisdotca/tsunagi/levels";

const sevens = await loadTsunagiLevels(7);       // 256 levels, easiest first; only 7×7 is fetched
openTsunagiLevels(7, new Set([1, 2, 3]));         // 16: the first block of sixteen is open from the start
const portals = await loadTsunagiLevels(7, "portals");   // the 32 levels with portals at 7×7
```

| Size | Levels | Size | Levels | Size | Levels |
| --- | --- | --- | --- | --- | --- |
| 4×4 | 192 | 7×7 | 256 | 10×10 | 128 |
| 5×5 | 256 | 8×8 | 256 | 11×11 | 64 |
| 6×6 | 256 | 9×9 | 256 | 12×12 | 128 |
| 13×13 | 128 | 14×14 | 128 | 15×15 | 128 |
| 20×20 | 64 | 25×25 | 64 | 30×30 | 64 |

Every level was made once, by `scripts/tsunagi-levels.ts` (4×4 to 12×12),
`scripts/tsunagi-levels-big.ts` (13×13 to 15×15) or `scripts/tsunagi-levels-huge.ts` (20×20 to
30×30), and is proved again
on every build: solved from scratch, it must have exactly one answer, the one
stored, filling every cell, with no two levels the same board turned or
mirrored. Levels come in blocks of sixteen, each block no easier on average
than the one before, the fifteenth and sixteenth its twist; a block opens
once every level of the one before is solved. `TSUNAGI_MARKS`
(`@johnmorrisdotca/tsunagi/marks`) rates every level 1 to 5 from its measured
difficulty.

The entry points, `@johnmorrisdotca/tsunagi/levels-4` to `/levels-30`, `/levels-portals`, `/layouts`, `/marks` and `/renumbered` among them, are listed under [Entry points](#entry-points) in the API section.

### Levels with portals

A portal is two rings inside the board: a line that goes into one comes out of the other, going the same way on, and both rings are cells it fills. A second set of levels is made of boards with them: 32 a size at 5×5 to 10×10, 12×12 and 15×15, in two blocks of sixteen, opened a block at a time like the others and numbered from 1 in their own set. A record that keeps a level by one number keeps a portal level as `levelSeed("portals", n)`. How a portal is written in a layout code, the rules `checkTsunagiAnswer` holds it to, and the layouts that are refused are in [docs/PORTALS.md](docs/PORTALS.md).

### The level of the day

```ts
import { dailyTsunagiLevel, tsunagiDay } from "@johnmorrisdotca/tsunagi";

dailyTsunagiLevel(7, new Date());      // a level number, 1 to 256: today's at 7×7
dailyTsunagiLevel(7, "2026-10-01");    // the same level for that day, from its text
tsunagiDay(new Date());                // "2026-10-01": the day, counted in UTC
```

The levels are fixed, so the level of the day needs no seed and no server: it is a pure function of the date and the size, the same for everybody on every machine, which is what lets two people compare a time on it. A day is counted in UTC, so it turns over at the same moment worldwide. Each size has a level of its own, and every level of a size comes up once before any comes up again (the size's count of levels, in days). It ignores which blocks a player has opened: today's level is open to everybody. The demo's **Today** button opens it.

## API

The [API reference](https://johnmorrisdotca.github.io/tsunagi/api.html) lists every export of every entry point with its signature and its doc comment. It is made from the source by `pnpm site`, so it cannot fall behind the code.

### Entry points

Each concern is an entry of its own, so a page loads only what it uses. Importing any of them on a server is safe.

| Import | What it holds |
| --- | --- |
| `@johnmorrisdotca/tsunagi` | the rules, the solver, the generator, the levels' counts, and `game.ts`'s pure play functions: everything but the boards, the drawing and the page |
| `@johnmorrisdotca/tsunagi/draw` | `drawTsunagi` and the rest of the drawing as SVG text, the colour sets, the boards, the style, and where everything sits in the drawing; no page needed |
| `@johnmorrisdotca/tsunagi/play` | `mountTsunagi`: a level played in any element by touch and mouse, with its buttons, words, zoom pad and events |
| `@johnmorrisdotca/tsunagi/element` | the `TsunagiBoard` class behind `<tsunagi-board>`, to extend or to define under another name |
| `@johnmorrisdotca/tsunagi/element/define` | defines `<tsunagi-board>` on the page, for its effect |
| `@johnmorrisdotca/tsunagi/levels` | `loadTsunagiLevels(size, set)`, `loadEveryTsunagiLevel()`, `tsunagiLevelsOf(size, set)`, `tsunagiLevelOf(size, layout, set)`, each size fetched only when loaded |
| `@johnmorrisdotca/tsunagi/levels-4` … `/levels-15`, `/levels-20`, `/levels-25`, `/levels-30` | one size's levels, `TSUNAGI_4` … `TSUNAGI_30`, as `[layout, answer]` pairs |
| `@johnmorrisdotca/tsunagi/levels-portals` | the levels with portals, `TSUNAGI_PORTAL_LEVELS`: every size's in one entry |
| `@johnmorrisdotca/tsunagi/layouts` | every level's board without its answer, `TSUNAGI_LAYOUTS` and `TSUNAGI_PORTAL_LAYOUTS` (by size, in level order): for a server that checks a solve or lists who solved which level, at about a third of the bytes of the levels |
| `@johnmorrisdotca/tsunagi/marks` | `TSUNAGI_MARKS` (each level's 1 to 5), `TSUNAGI_ROLES` (each twist level's part in its block) and `TSUNAGI_PORTAL_MARKS` |
| `@johnmorrisdotca/tsunagi/renumbered` | where each old level went when the levels were renumbered on 2026-09-26, for anyone who stored solves by number |

### The calls to learn first

| Export | What it does |
| --- | --- |
| `decodeLayout(code, size)`, `encodeLayout(cells, walls, more)` | a layout's code and the `LinkLayout` it stands for: marbles (`ends`), cells, walls, waypoints, wrap, portals, hexagon |
| `checkTsunagiAnswer(size, layout, answer)` | whether an answer joins every pair as the rules allow, in O(cells); `{ ok: true }` or the first reason it does not |
| `noLines`, `pressAt`, `dragTo`, `dragThrough`, `dragFinger`, `letGo` | drawing, as a finger does it: each takes the lines drawn so far and returns new ones; `dragFinger` keeps the finger's `Reach` over the end of a line that has been through a portal |
| `joined`, `allJoined`, `unjoinedPairs`, `filled`, `ownersOf` | what the lines drawn so far amount to |
| `encodeLines`, `decodeLines` | lines half drawn, as a code, to keep a game and come back to it |
| `countSolutions(layout, limit, budget)` | counts answers up to `limit`, within a `budget` of search steps (dead ends, from 13×13), and returns one |
| `challengesOf`, `isTwist`, `twistRole`, `tsunagiMarks` | what a layout asks of a player, and a level's mark |
| `newTsunagiGame`, `pressGame`, `dragGame`, `liftGame`, `undoGame`, `restartGame`, `checkGame`, `cheatGame` | a game in play as pure functions: lines, strokes, Undo, explosions, a stroke limit, Check and Cheat; each returns a new game |
| `openTsunagiLevels`, `nextTsunagiLevel`, `firstUnsolvedTsunagiLevel`, `tsunagiBand` | which levels a player may open, which comes next, and which third of a size a level is in; each takes the set (`classic` or `portals`) last |
| `dailyTsunagiLevel(size, date)`, `tsunagiDay(date)`, `isTsunagiDay(text)` | the level of the day at a size, from the date alone; a date as `YYYY-MM-DD` in UTC; whether a text is a real one |

The rest of the calls, by job, are in [docs/API-CALLS.md](docs/API-CALLS.md). Every function is pure: it returns new values and never changes what it was given.

## Theming

Nothing here is branded. The drawing and the playable board are coloured by custom properties, and a page sets only the ones it wants different. The plain `paper` board follows the device's light or dark setting; `data-theme="light"` or `"dark"` on `<html>` forces one. The other boards (`wood`, `green`, `blue`, `red`, `black`) carry their own colours in both. The marbles' colours are not properties: they are a [colour set](#drawing-a-board), or one of your own.

**The drawing** (`drawTsunagi`), custom properties on `.tsunagi`; the dark values are those of the `paper` board:

| Property | What it colours | Light | Dark |
| --- | --- | --- | --- |
| `--tsu-paper` | the top of the board's paper | `#fbf8f1` | `#262a27` |
| `--tsu-paper-deep` | the foot of the paper (the same, unless the board shades) | `#fbf8f1` | `#262a27` |
| `--tsu-frame` | the frame round the board | `#a98954` | `#6b5632` |
| `--tsu-grid` | the thin lines between cells | `#cfc6b2` | `#3f443f` |
| `--tsu-ink` | walls, blocked cells, bridges and the board's rim | `#1f2320` | `#ece8dc` |
| `--tsu-coordinate` | the row numbers and column letters | `#5b3d1c` | `#e8d3b6` |
| `--tsu-shu` | the burst where an explosion took a line out | `#d9381e` | the same |
| `--tsu-good` | a solved board's wash | `#2f7a4f` | the same |
| `--tsu-font` | the numbers' type | the system's own | the same |

**The playable board** (`mountTsunagi` and `<tsunagi-board>`) wears the drawing's properties, and six of its own on `.tsunagi-play`:

| Property | What it colours | Light | Dark |
| --- | --- | --- | --- |
| `--tsp-ink` | text and a pressed button | `#1f2320` | `#ece8dc` |
| `--tsp-muted` | the lines of words under the board | `#6b6f68` | `#a09d93` |
| `--tsp-rule` | borders | `#ddd6c6` | `#3a3d38` |
| `--tsp-surface` | the buttons and chips | `#fbf8f1` | `#1d201e` |
| `--tsp-accent` | a warning in the words under the board | `#b5452c` | `#ff8a6b` |
| `--tsp-good` | the progress line once the level is solved | `#2f7a4f` | `#6fcf97` |

```css
tsunagi-board, .tsunagi, .tsunagi-play { --tsu-ink: #2b2118; --tsp-accent: #8a1c1c; }
```

The demo's own page is the worked example: its green felt and its cloth patches are the family's stylesheet, [`demo/family.css`](./demo/family.css), which is the same file byte for byte in every sibling's demo, and a test holds it to its hash. The drawing's parts carry classes and data attributes for anything a property cannot reach: see [Drawing a board](#drawing-a-board).

## Limits

All of these are held by tests, and the ones with a name are exported.

| Limit | Value | Where |
| --- | --- | --- |
| Sizes | 4×4 to 30×30, one side of a square: 4 to 15, then 20, 25 and 30; the portal levels at 5×5 to 10×10, 12×12 and 15×15 | `TSUNAGI_SIZES`, `TSUNAGI_PORTAL_SIZES` |
| Levels | each size's own, in blocks of sixteen | `TSUNAGI_LEVEL_COUNTS`, `TSUNAGI_BLOCK` |
| Pairs on a board | eighty-two, one character each: `A` to `Z`, `0` to `9`, `a` to `z`, then twenty marks; a board of thirty-six or more has no waypoints | `PAIR_LETTERS`, `CAPITAL_PAIRS` |
| Boards with a few lines | at most two thirds of the side | `sparseMost(size)` |
| Answers counted | two, so that "many" costs no more than "two" | the `limit` argument of `countSolutions` |
| The solver's work | none unless you give a `budget`; it is dead ends from 13×13 and search steps below | the `budget` argument of `countSolutions` and `countSolutionsSat` |
| Which solver | the search below 13×13, SAT from 13×13 (and for any board with portals), a binary pair from 16×16 | `SAT_FROM_SIZE`, `SAT_BINARY_FROM_SIZE` |
| The zoom pad | from 10×10, up to 3 times | `TSUNAGI_ZOOM_FROM`, `TSUNAGI_MOST_ZOOM` |
| A day | `YYYY-MM-DD`, counted in UTC | `isTsunagiDay` |

A generator never runs on a server unless you ask it to. The check never searches: it is linear in the size of the board.

## Accessibility

- **A screen reader hears the board.** The drawing is a group with a label (the size, or the label you give it), and each marble, bridge, waypoint and portal is an image with its own label naming its pair and where it is. Row and column marks are for sighted use and are hidden from a screen reader. The words are in English and Japanese (`language`), and follow the page's `lang`.
- **Progress is announced.** Under the playable board, the progress line, the message line and the line that says what Check found are live regions, so a change in them is spoken without moving focus.
- **Colour is never the only way to tell pairs apart.** `marks: "numbers"` puts each pair's number on its marbles; there is a colour-blind colour set; and every pair also has its own cells washed in its colour, so a line is told by where it goes as well as what it is called. Contrast follows the board you choose, and the plain `paper` board follows the device's light or dark setting.
- **Touch and pointer.** Buttons and chips are at least 44 px high, and the board has `touch-action: none`, so a finger drawing a line never scrolls the page. A line is drawn by pointer events, captured on the press, so a drag that leaves the board still ends. Ctrl or Cmd with Z undoes.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, nothing in the drawing moves. The drawing cannot be selected, dragged or double-tapped into a selection.
- **Not yet.** A line cannot be drawn from the keyboard: the cells cannot be walked with keys, and a person who cannot use a pointer cannot play a level today. It is on the [Roadmap](#roadmap). The check and the rules have no such limit, so a page of your own can offer a different way in, using the pure functions.

## Browser support

Any browser with ES2020 modules, custom elements, pointer events and CSS `aspect-ratio`: Chrome and Edge 88, Safari 15, Firefox 89, all from 2021 on. The element draws in the page's own DOM, with no shadow DOM and no CSS the page cannot reach. The demo is played in a real Chromium at a phone's width (with touch) and a desk's, and in WebKit, Safari's engine, at a phone's width; Firefox is not in that run. The package itself (everything but the drawing and the page) needs no DOM: it runs in Node 22 or later (CI tests 22 and 24). Deno and Bun are not tested.

## Languages

English and Japanese, chosen by the `language` option, the host's `lang` or the page's, and followed when the page's `lang` changes. The demo has a chooser of its own and takes the browser's language on a first visit. The board's words (`TSUNAGI_STRINGS`, read with `tsunagiSay`) are in both. **Japanese: included; not yet reviewed by a native reader. Corrections welcome.** Every string is listed beside its English in [docs/strings-ja.md](./docs/strings-ja.md), and there is an [issue template](https://github.com/johnmorrisdotca/tsunagi/issues/new?template=fix-a-translation.md) for fixing one. Any other language is a table of your own, passed beside these two.

## Roadmap

Not here yet, and each welcome as an [issue](https://github.com/johnmorrisdotca/tsunagi/issues):

- Drawing a line from the keyboard. A line is drawn by pointer today; Ctrl or Cmd with Z undoes, and the drawing is described to a screen reader, but the cells cannot be walked with keys.
- A command line: check an answer, count a board's answers, and print a level as text.

Left out on purpose: levels made from a seed when the page opens, because a fixed level is what lets times be compared; and any account, ranking or storage. A page keeps its own games: the events hand them over.

## Making levels

Levels are found by seeded generators, proved to have exactly one answer, ordered by measured difficulty and written by scripts in `scripts/`, so the same run writes the same files and a level already published keeps its number. The commands, the two ways big boards are made (clues taken away, and a solver that learns from its dead ends), the numbers measured on one core of a desk on 2026-10-05, and what each size takes are in [docs/MAKING-LEVELS.md](docs/MAKING-LEVELS.md).

```sh
node scripts/tsunagi-levels.ts 7              # 7×7 again: its twists placed, its marks measured, every board kept at its number
node scripts/tsunagi-levels.ts --grow 10      # 10×10 grown to whole blocks of sixteen and reordered, easiest first
```

## Architecture

The rules, the solver, the generator and the game in play are plain functions over short codes,
with no DOM. The drawing is SVG text in an entry of its own, so a server that only checks an
answer never loads it, and the page's part (the mount and the element) is another. Each size's
levels is an entry of its own, so a page loads only the size it shows.

The whole tree, with a line on each file, is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the main entry (`index.ts`) and the codes and rules it exports, the solver and the SAT solver behind it, the generators, the game in play, the drawing, the page, and a data file for each size of levels. Tests sit beside the code they test (`*.test.ts`, one `levels.<size>.test.ts` a size). `scripts/` makes the levels and the twists, builds the demo and its API reference page and checks the package as npm packs it; `demo/` is the playable page, and `e2e/` its browser tests.

## The name

*Tsunagi* (繋ぎ) is Japanese for "joining", "a link": what holds two things
together. It comes from the verb *tsunagu* (繋ぐ), to tie, to connect, to hold
hands, and is said in three beats, *tsu-na-gi*. In the puzzle every pair of
marbles is joined by its own line, and the lines together fill the board.

## Where it comes from, and where it is used

Tsunagi was built for [Itsutsu](https://itsutsu.com), a site for board games, puzzles, card games and dice games played at your own pace. *Itsutsu* (五つ) is Japanese for "five", after five in a row, the game the site began with. The line-joining puzzle was made there, level by level, each proved to have one answer and each checked on a server in O(cells); once it stood alone it seemed worth sharing.

### Used by

- [Itsutsu](https://itsutsu.com), for its Tsunagi puzzle, every level and the check.

Using Tsunagi in something? Open an *Add my project* issue and we will add you.

### The family

<!-- family:start (made by scripts/family-readme.mjs from scripts/family-template.mjs; change those, not this) -->
Tsunagi is one of twenty-four packages, each made for the same site, each at
[github.com/johnmorrisdotca](https://github.com/johnmorrisdotca). The code of every one is MIT.

- [Korokoro](https://github.com/johnmorrisdotca/korokoro) (コロコロ): dice, with notation, exact odds, real sounds and the dice of many games. [Demo](https://johnmorrisdotca.github.io/korokoro/).
- [Kyuubu](https://github.com/johnmorrisdotca/kyuubu) (キューブ): a turning cube for the browser, 2×2 to 7×7, with record solves to replay. [Demo](https://johnmorrisdotca.github.io/kyuubu/).
- [Hitotsu](https://github.com/johnmorrisdotca/hitotsu) (一つ): a colour-card shedding game for two to eight, with the house rules people play. [Demo](https://johnmorrisdotca.github.io/hitotsu/).
- [Toranpu](https://github.com/johnmorrisdotca/toranpu) (トランプ): a deck of playing cards, card games with computer players, and solitaires. [Demo](https://johnmorrisdotca.github.io/toranpu/).
- [Tane](https://github.com/johnmorrisdotca/tane) (種): seeded random numbers and daily seeds, the same in every browser and on every server. [Demo](https://johnmorrisdotca.github.io/tane/).
- [Narabe](https://github.com/johnmorrisdotca/narabe) (並べ): one rules engine for abstract board games, from gomoku and Reversi to Go and checkers. [Demo](https://johnmorrisdotca.github.io/narabe/).
- [Tenka](https://github.com/johnmorrisdotca/tenka) (天下): world conquest for two to six, on a map of the real world. [Demo](https://johnmorrisdotca.github.io/tenka/).
- [Kumimoji](https://github.com/johnmorrisdotca/kumimoji) (組み文字): a crossword tile race, in English and Japanese kana. [Demo](https://johnmorrisdotca.github.io/kumimoji/).
- [Tsunagi](https://github.com/johnmorrisdotca/tsunagi) (繋ぎ): a line-joining logic puzzle whose every level has exactly one answer. [Demo](https://johnmorrisdotca.github.io/tsunagi/).
- [Jarajara](https://github.com/johnmorrisdotca/jarajara) (ジャラジャラ): mahjong tiles drawn as SVG, stacked layouts, and the matching solitaire Awase. [Demo](https://johnmorrisdotca.github.io/jarajara/).
- [Suido](https://github.com/johnmorrisdotca/suido) (水道): a pipe puzzle: turn the pieces until the water reaches every drain. [Demo](https://johnmorrisdotca.github.io/suido/).
- [Domino](https://github.com/johnmorrisdotca/domino) (ドミノ): dominoes and Mexican Train. [Demo](https://johnmorrisdotca.github.io/domino/).
- [Kotoba](https://github.com/johnmorrisdotca/kotoba) (言葉): word lists and word-game rules in English, French, German and Japanese. [Demo](https://johnmorrisdotca.github.io/kotoba/).
- [Sugoroku](https://github.com/johnmorrisdotca/sugoroku) (双六): backgammon and its variants, with the doubling cube and match play. [Demo](https://johnmorrisdotca.github.io/sugoroku/).
- [Kazu](https://github.com/johnmorrisdotca/kazu) (数): grid number puzzles: Sudoku and its variants, Futoshiki and Skyscrapers. [Demo](https://johnmorrisdotca.github.io/kazu/).
- [Meikyuu](https://github.com/johnmorrisdotca/meikyuu) (迷宮): mazes on squares, hexagons, triangles and circles, made from a seed and drawn through with a finger or the mouse. [Demo](https://johnmorrisdotca.github.io/meikyuu/).
- [Hikidashi](https://github.com/johnmorrisdotca/hikidashi) (引き出し): a drawer of small Japanese text tools: era dates, kanji numerals, readings and sentence difficulty. [Demo](https://johnmorrisdotca.github.io/hikidashi/).
- [Chizu](https://github.com/johnmorrisdotca/chizu) (地図): maps of the world and of countries' regions, in English and Japanese, with a quiz and callouts. [Demo](https://johnmorrisdotca.github.io/chizu/).
- [Bushu](https://github.com/johnmorrisdotca/bushu) (部首): find a kanji by the parts it is made of. [Demo](https://johnmorrisdotca.github.io/bushu/).
- [Tobiishi](https://github.com/johnmorrisdotca/tobiishi) (飛び石): peg solitaire with nine boards and seeded solvable challenges. [Demo](https://johnmorrisdotca.github.io/tobiishi/).
- [Jirai](https://github.com/johnmorrisdotca/jirai) (地雷): minesweeper on shaped grids with verified no-guess boards. [Demo](https://johnmorrisdotca.github.io/jirai/).
- [Gunjin](https://github.com/johnmorrisdotca/gunjin) (軍人): five hidden-rank strategy games with pass-the-device play. [Demo](https://johnmorrisdotca.github.io/gunjin/).
- [Karakuri](https://github.com/johnmorrisdotca/karakuri) (からくり): eight hyper-casual puzzle games, some of them physics: draw a shield, pull pins, cut ropes, slide blocks, pour tubes. [Demo](https://johnmorrisdotca.github.io/karakuri/).
- [Houseki](https://github.com/johnmorrisdotca/houseki) (宝石): gem and stone matching puzzles: falling triplets, stone collapse, colour chains and gem swap. [Demo](https://johnmorrisdotca.github.io/houseki/).

**This package is Tsunagi.** The demos of all twenty-four share one header and footer, so each links the rest.
<!-- family:end -->

## Development

```sh
pnpm install
pnpm check          # lint, types and every test, every level proved again
pnpm test:package   # pack, install and import it as somebody who installed it would
pnpm test:demo      # build the demo and play it in a real browser, at a phone's width and a desk's
pnpm site           # build the demo into site/, as the Pages workflow publishes it
pnpm test:frameworks  # the README's React, Vue, Svelte, Angular and plain-page examples, built from the tarball and played (needs the network)
pnpm docs:make      # rewrite docs/strings-ja.md after changing a word of the board
pnpm screenshots:readme  # retake the README's pictures (docs/images) from the built demo, in light and dark
pnpm test:readme    # run every ts and js example in this README against the built package
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The commands are under [Development](#development).

Please follow the [code of conduct](./CODE_OF_CONDUCT.md). A way to make the check or the solver run for long, or markup that gets out of the drawing, is for the [security policy](./SECURITY.md), not a public issue.

## Changes

Every release is written up in [CHANGELOG.md](./CHANGELOG.md), newest first, with its date. A level keeps its number, its board and its answer from one release to the next, so a solve kept by any version is still the same solve, and a change to what the package exports follows semantic versioning. The releases, each with its tarball, are on the [releases page](https://github.com/johnmorrisdotca/tsunagi/releases).

## Licence

MIT, © John Morris. The levels are part of the package and under the same licence.
