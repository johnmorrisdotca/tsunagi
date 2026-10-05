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

<p align="center">
  <img src="docs/desktop.jpg" alt="A 7×7 level with five of its seven pairs joined, under the demo's header with its language chooser, five cloth patches and the Help switch: the size choice, the level arrows and the Today button, then the board on green felt with its difficulty chip, the Undo, Restart and Check buttons and the line '5 of 7 joined · 73% of the board'" width="620">
  <img src="docs/phone.jpg" alt="A 6×6 level with three of its eight pairs joined, on a phone in dark mode and in Japanese: the board on green felt with its difficulty chip, the three buttons, the progress line (3 of 8 pairs joined, 75% of the board) and the first of the settings under it" width="200">
</p>

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
- **Big boards, made by taking clues away.** A 30×30 board with one answer is not found by luck; `reducedCandidate` starts from a filling cut into short lines and joins them while the solver can still prove one answer within a budget of dead ends, so the boards come out with a cheap proof by construction: on one core of a desk (measured 2026-10-05) a median 3 seconds at 20×20, 11 at 25×25 and 25 to 66 at 30×30, and 20×20, 25×25 and 30×30 have 64 levels each.
- **A difficulty measure**, so a level has a mark from 1 to 5 and the levels of a size run easiest first.
- **Drawn as SVG text**, in an entry of its own: colours or numbers on the marbles, dots or lines, four colour sets, six boards, bridges drawn as bridges. A server that only checks answers never loads it.
- **Played in any page** by touch and mouse, with Undo, Restart, Check, Cheat and the zoom pad a big board needs, as one function call (`mountTsunagi`) or one tag (`<tsunagi-board>`).
- **Games as short strings**: a layout, an answer, a game half drawn, each a code a database column can keep.
- **English and Japanese**, in the board's words and the demo.
- **No dependencies**, no network requests, no sound, and nothing stored outside the page it is in.

## Use it in your project

Tsunagi is three things, each usable without the others: **the puzzle** (rules, solver, generator and levels, as plain functions over strings), **the drawing** (SVG text), and **the page** (a mounted board or a tag). The table under [Levels](#levels) says which entry holds which. The examples are at 6×6.

### 1. The API alone, on a server

```ts
import { checkTsunagiAnswer, dailyTsunagiLevel } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const today = dailyTsunagiLevel(6, new Date());   // the level of the day at 6×6: 1 to 256
const [givens, answer] = TSUNAGI_6[today! - 1];     // send `givens` to the browser; keep `answer`
checkTsunagiAnswer(6, givens, answerFromThePlayer); // { ok: true } or { ok: false, reason }, in O(cells)
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

```ts
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

`pnpm test:frameworks` builds these recipes from the packed tarball in a scratch project for each of the five and plays a level to its end in Chromium and WebKit; it needs the network and a few minutes, so it is run before a release and in CI rather than with `pnpm check`.

### What a developer gets

- **Typed results**, with a doc comment on every export. Every function is pure and returns new values.
- **No dependencies.** ES modules, an entry per concern, and `sideEffects` set so that only the define entry has an effect.
- **Where it runs.** See [Browser support](#browser-support).

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

A custom board is a look of colours: `{ paper: "#fbf8f1" | ["#f0cf95", "#d3a662"], frame, grid, ink, coordinate }`.
Every colour is also a custom property on `.tsunagi` (`--tsu-paper`,
`--tsu-paper-deep`, `--tsu-frame`, `--tsu-grid`, `--tsu-ink`, `--tsu-coordinate`,
`--tsu-shu`, `--tsu-good`), so a page sets only what it wants different.
The parts carry classes and data attributes to style or find them: `tsu-marble`
(`data-pair`, `data-cell`), `tsu-bead`, `tsu-line` (`data-pair`, `data-cells`),
`tsu-bridge`, `tsu-over-bridge`, `tsu-wall` (`data-edge`), `tsu-waypoint`, `tsu-portal` (`data-portal`, `data-cells`; its rings are `tsu-portal-end`
and its link `tsu-portal-link`), `tsu-flag`, `tsu-blast`, `tsu-hex-cell`. Nothing in the drawing can be selected,
dragged or double-tapped into a selection, and with reduced motion asked for
nothing moves. `drawTsunagiCode(givens, size, options)` draws a level from its
code, and `drawTsunagiMarble(pair, options)` one marble for a legend. `tsunagiGeometry(layout)`
and `cellAtPoint(geometry, x, y)` say where every cell is in the drawing and which
cell a point is over, so a page of your own can play it.

A drawing is made of groups a page can redraw one at a time: each pair's washes are in
`.tsu-washes > [data-pair]`, its little marbles in `.tsu-beads > [data-pair]` (and
`.tsu-ghosts > [data-pair]` on a board that wraps) and its line is a `.tsu-line`. `drawTsunagiPair(layout, pair, id, options)`
makes the three for one pair, so a finger moving through a cell redraws one or two pairs and not the
thousands of elements of a 30×30 board (`mountTsunagi` does this; on a phone with the processor
slowed four times, a move on a full 30×30 board took a median 2.7 ms to handle, where redrawing the
whole drawing took 18.2). A board with bridges is redrawn whole, since a bridge's deck and the lines
under it depend on every line.

## Playing it in a page

```ts
import { mountTsunagi } from "@johnmorrisdotca/tsunagi/play";

const board = mountTsunagi(document.getElementById("here")!, {
  size: 7, givens, answer, level: 12,         // a level; `level` shows its difficulty and its place in its block
  marks: "numbers", fill: "lines", colours: "colour-blind", board: "wood",
  cheats: true, explosions: "soft", chips: true,
  onSolve: ({ answer, helped }) => send(answer, helped),   // `answer` is what checkTsunagiAnswer takes
});
board?.undo(); board?.check(); board?.load({ size: 7, givens: other, answer: otherAnswer });
```

It plays the way the site does. Press a marble (or the end of a line) and drag to
its partner; drag back over a line to shorten it, cell by cell; tap a marble to
clear its line; a line dragged into another cuts the other back. Drag into a
portal and the line goes in and comes out of the other ring in the same drag, and the finger is
taken to be over the end of the line from then on (`dragFinger`, `Reach`): move it a cell and the
line moves a cell, where it now is; where that would take the finger off the board, lift it and press
the end of the line again. Drag back over the portal and the line is as it was before it. Pointer events,
captured on the press so a drag that leaves the board still ends, with
`touch-action: none` so a finger drawing a line never scrolls the page. A big
board (10×10 up) is looked at through a box with a zoom and move pad, the wheel,
and the box's edge, which moves the view while a line is dragged near it. The box
keeps one steady square, and the lines of words under it keep the room they need,
so nothing moves as lines are drawn or messages come and go.

Under the board, unless `controls: false`: **Undo**, **Restart**, **Check** (the
marbles of pairs not joined flash, and it says how many) and, if `cheats` is on and
the level has an `answer`, **Cheat**, which draws one unfinished line and marks the
solve *helped*; a line of progress; and the lines a level's twists ask for: strokes
left of a limit, the count to the next explosion, what the last explosion did. `chips`
adds a row with the level's difficulty (1 to 5) and a chip for each challenge on it,
pressed to say what it means. Everything a button does is also a method on the
handle (`undo`, `restart`, `check`, `cheat`, `fit`, `load`, `set`, `destroy`).

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
| `@johnmorrisdotca/tsunagi/marks` | `TSUNAGI_MARKS` (each level's 1 to 5), `TSUNAGI_ROLES` (each twist level's part in its block) and `TSUNAGI_PORTAL_MARKS` |
| `@johnmorrisdotca/tsunagi/renumbered` | where each old level went when the levels were renumbered on 2026-09-26, for anyone who stored solves by number |

### Levels with portals

A portal is two rings inside the board: a line that goes into one comes out of the other, going
the same way on, and both rings are cells it fills. They are written after the cells and the walls,
`|portals3-40,17-52` (each pair as its two cells, the smaller first, the pairs in order, after `wrap` if
there is one), and a second set of levels is made of boards with them: 32 a size at 5×5 to 10×10, 12×12
and 15×15, in two blocks of sixteen, the first block's boards with one portal and the second's with two
or three. They open a block at a time like the others and are numbered from 1 in their own set;
a record that keeps a level by one number keeps a portal level as `levelSeed("portals", n)`, 1,000 and
its number (`setOfSeed` reads it back), which no level of the first set reaches.

The rules a portal keeps are small, and `checkTsunagiAnswer` holds every one. A portal cell is an empty
cell: never a stone, a waypoint, a bridge or blocked, never beside another portal's, and a board with portals
has no bridges and is no hexagon. A line steps into a portal cell and comes out of the other, going the same
way on, into the cell beyond it: where that cell is off the board, blocked, across a wall or a stone of another
pair, that way into the portal is no way. The two portal cells are one line's, and the portal is gone
through once; where two ways through portals (or a portal and a plain step) would join the same two cells,
the layout is refused (`decodeLayout` returns null), because an answer's cells could not tell them apart.

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

| Export | What it does |
| --- | --- |
| `decodeLayout(code, size)`, `encodeLayout(cells, walls, more)` | a layout's code and the `LinkLayout` it stands for: marbles (`ends`), cells, walls, waypoints, wrap, portals, hexagon |
| `encodeAnswer(owners)`, `answerOf(layout, lines)`, `linesOfAnswer(layout, answer)` | an answer as a code: a letter for each cell's line, `#` blocked, `+` a bridge |
| `checkTsunagiAnswer(size, layout, answer)` | whether an answer joins every pair as the rules allow, in O(cells); `{ ok: true }` or the first reason it does not |
| `noLines`, `pressAt`, `dragTo`, `dragThrough`, `dragFinger`, `letGo` | drawing, as a finger does it: each takes the lines drawn so far and returns new ones; `dragFinger` keeps the finger's `Reach` over the end of a line that has been through a portal |
| `joined`, `allJoined`, `unjoinedPairs`, `filled`, `ownersOf` | what the lines drawn so far amount to |
| `encodeLines`, `decodeLines` | lines half drawn, as a code, to keep a game and come back to it |
| `countSolutions(layout, limit, budget)` | counts answers up to `limit`, within a `budget` of search steps (dead ends, from 13×13), and returns one |
| `countSolutionsSat(layout, limit, budget, guide, colours)` | the same count made by SAT, a solver that learns from its dead ends: what proves every 13×13 to 15×15 level, and what `countSolutions` is from 13×13; `colours` writes a cell's pair as a variable each (`one-hot`, the default) or as a binary number (`binary`, which a board of dozens of pairs needs) |
| `countSolutionsOfLevel(layout, answer)` | how a level is proved and measured: the search of `countSolutions` to 15×15, and from 16×16 or with portals the SAT search started from the level's own answer, which finds it at once and looks for every other |
| `reducedCandidate(size, random, options)`, `withPortals` | a big board made by taking clues away, with blocked cells, wrap, waypoints or portals; portals put into a filling |
| `candidate`, `repairedCandidate`, `sparseCandidate`, `layoutOf` | a new board from a seeded `Random`: a random filling of lines, cut back to its ends |
| `bridgeCandidate`, `wallCandidate`, `waypointCandidate`, `wrapCandidate`, `hexCandidate`, `bridgeAndWallCandidate` | a board with a twist |
| `measureLevel`, `difficultyScores`, `orderByDifficulty` | how hard a board is: corners, guessing, cells not forced, its longest line |
| `challengesOf`, `isTwist`, `twistRole`, `tsunagiMarks` | what a layout asks of a player, and a level's mark |
| `transformed`, `relettered`, `symmetryKey` | a board turned, mirrored and relettered, and one key for all eight |
| `cheatLine(layout, lines, answer)` | one line of the answer drawn in, for a player who asks for help |
| `newTsunagiGame`, `pressGame`, `dragGame`, `liftGame`, `undoGame`, `restartGame`, `checkGame`, `cheatGame` | a game in play as pure functions: lines, strokes, Undo, explosions, a stroke limit, Check and Cheat; each returns a new game |
| `tsunagiProgress`, `helpOf`, `helpOpensNext`, `strongestTsunagiHelp` | what a game stands at, and which help (Cheat, softened or no explosions) a solve used and what that costs |
| `seededRandom(seed)` | the mulberry32 stream every generator draws from |
| `openTsunagiLevels`, `nextTsunagiLevel`, `firstUnsolvedTsunagiLevel`, `tsunagiBand` | which levels a player may open, which comes next, and which third of a size a level is in; each takes the set (`classic` or `portals`) last |
| `levelCountOf`, `levelSeed`, `setOfSeed` | how many levels a size has in a set, and the one number a record keeps a level of either set by |
| `dailyTsunagiLevel(size, date)`, `tsunagiDay(date)`, `isTsunagiDay(text)` | the level of the day at a size, from the date alone; a date as `YYYY-MM-DD` in UTC; whether a text is a real one |

Every function is pure: it returns new values and never changes what it was
given.

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

```sh
node scripts/tsunagi-levels.ts 7              # 7×7 again: its twists placed, its marks measured, every board kept at its number
node scripts/tsunagi-levels.ts --grow 10      # 10×10 grown to whole blocks of sixteen and reordered, easiest first
```

The script finds boards with a seeded generator, keeps those the solver proves
have one answer, drops any that is another turned or mirrored, measures and
orders them, and writes the size's file, its marks and its twists. Seeded, so
the same run writes the same files. A board already published keeps its
number unless a size is grown, and then `/renumbered` says where each old
level went.

13×13 to 15×15 are made in two steps, because their boards are found by the
thousand on every core of a desk: `node scripts/tsunagi-pool.ts 15 plain 300`
runs seeded jobs in parallel (`plain`, or a twist: `bridge`, `walls`, `wrap` …)
and keeps each board proved to have one answer and measured, and
`node scripts/tsunagi-levels-big.ts` takes the jobs recorded in it and writes
the files. A job's boards depend only on its number, never on the machine.
The plain boards of 13×13 and 14×14 take seconds and 15×15's about six minutes
on twenty cores; the twist boards take longer, about an hour in all. Boards from 13×13
to 15×15 have at most sixteen lines, the most colours there are, and are proved by
`countSolutionsSat`: 12×12 was the ceiling until a solver that learns from its
dead ends replaced the one that walks into them again.

20×20, 25×25, 30×30 and the portal levels are made the other way round, because a board
that big with that few lines is almost never found by luck and never mended in a
useful time: `node scripts/tsunagi-reduce-pool.ts 30 plain 200` starts each board from a
filling cut into pieces of four cells and joins neighbours while the solver, started from the
filling's own answer, can still prove one answer within a budget of dead ends (the job's
number sets the budget, 3,000 to 50,000: the bigger, the fewer lines and the harder the board),
and keeps boards of at most 82 lines. `node scripts/tsunagi-levels-huge.ts` and
`node scripts/tsunagi-levels-portals.ts` take the pools and write the levels, the marks and the
twists.

Measured on one core of a desk, 2026-10-05, six attempts each: a 20×20 takes a median 3.4 seconds
(range 1.3 to 7), a 25×25 10.9 (7 to 18) and a 30×30 24.5 at a budget of 6,000 (four attempts in six end
in a board of at most 82 lines) or 66 at 25,000; with two portals 20×20 takes 3.6, 25×25 9.2 and 30×30
44.7 seconds. Each board is then proved from its own answer in a fraction of a second to about a
second. A 30×30 that wraps is the hardest to make, since every cell has four neighbours: it needs a
budget of 200,000, about five minutes, and one attempt in three or four yields a board of 82 lines or
fewer. The pools the fixed levels were chosen from took roughly an hour and a half of a twenty-core desk
for 30×30 and under an hour for the other two sizes together.

## Architecture

The rules, the solver, the generator and the game in play are plain functions over short codes,
with no DOM. The drawing is SVG text in an entry of its own, so a server that only checks an
answer never loads it, and the page's part (the mount and the element) is another. Each size's
levels is an entry of its own, so a page loads only the size it shows.

```text
src/
├── index.ts          the main entry: everything but the levels, the drawing and the page
├── code.ts           layouts and answers as short codes, and the board each stands for
├── steps.ts          where a line may go next on a board: walls, bridges, portals, wrap, hexagons
├── lines.ts          the lines a player has drawn, and what a press and a drag do to them
├── check.ts          whether an answer joins every pair as the rules allow
├── solve.ts          the solver, which counts a board's answers up to a limit (4×4 to 12×12)
├── solveSat.ts       the same count by SAT, for 13×13 and above and for portals: the board written as clauses
├── sat.ts            a small SAT solver: clause learning, restarts, clauses added between solves
├── generate.ts       new boards from a seed: lines laid at random, cut back to their ends
├── reduce.ts         big boards made by taking clues away, with portals, wrap, waypoints and blocked cells
├── twists.ts         boards with a twist: walls, bridges, waypoints, wrap, hexagons (portals are `reduce.ts`'s)
├── sparse.ts         sparse boards: few marbles and long lines
├── explosions.ts     explosions that break a line, and a limit on strokes
├── difficulty.ts     how hard a level is, measured from its board and its answer
├── ladder.ts         what a level asks of a player, read from its board
├── ladder.types.ts   the challenges a board can have
├── cheat.ts          one line of the answer drawn in, for a player who asks for help
├── game.ts           a game in play as pure functions: strokes, Undo, explosions, Check, Cheat, help
├── levels.ts         the "/levels" entry: each size's levels, loaded when asked
├── levelCounts.ts    how many levels each size has
├── daily.ts          the level of the day at a size, from the date alone
├── levelBlocks.ts    levels in blocks of sixteen, and which a player may open
├── renumber.ts       a record kept by level number, moved to the numbers levels have now
├── levels.suite.ts   the proof each size's levels test runs: one answer, the one stored
├── random.ts         the seeded random numbers every board is made from
├── draw-entry.ts     the "/draw" entry: the drawing, its colours and boards, and where everything sits
├── draw.ts           a board as SVG text: marbles, lines, walls, bridges under and over, wrap, hexagons
├── geometry.ts       where every cell is in the drawing, and which cell a point is over
├── colours.ts        the colour sets, and how a colour is shaded for a marble, a line and a wash
├── boards.ts         the boards a drawing sits on: paper, wood and four felts, or a look of your own
├── style.ts          the drawing's style: its colours as custom properties, a flash and a burst
├── strings.ts        the words, in English and Japanese, for a screen reader and for the board's buttons
├── play-entry.ts     the "/play" entry: a level played in any element
├── mount.ts          mountTsunagi: draws a level into an element and plays it by touch and mouse
├── viewport.ts       the arithmetic of zooming and moving a big board through its box
├── playStyle.ts      the style of a playable board: its box, buttons, words and zoom pad
├── element.ts        the "/element" entry: the <tsunagi-board> class
├── element-define.ts the "/element/define" entry: defines the tag on the page
├── version.ts        the package's version
└── levels/
    ├── size4.data.ts       the 4×4 levels, each a layout and its one answer
    ├── size5.data.ts       5×5
    ├── size6.data.ts       6×6
    ├── size7.data.ts       7×7
    ├── size8.data.ts       8×8
    ├── size9.data.ts       9×9
    ├── size10.data.ts      10×10
    ├── size11.data.ts      11×11
    ├── size12.data.ts      12×12
    ├── size13.data.ts      13×13
    ├── size14.data.ts      14×14
    ├── size15.data.ts      15×15
    ├── size20.data.ts      20×20
    ├── size25.data.ts      25×25
    ├── size30.data.ts      30×30
    ├── portals.data.ts     the levels with portals, every size's
    ├── marks.data.ts       every level's difficulty, 1 to 5, and each twist's part in its block
    └── renumbered.data.ts  where each old level went when the levels were renumbered
```

Tests sit beside the code they test (`*.test.ts`, one `levels.<size>.test.ts`
a size). `scripts/` makes the levels and the twists, builds the demo and its API reference page and checks
the package as npm packs it; `demo/` is the playable page, and `e2e/` its browser tests.

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
Tsunagi is one of twenty-two packages, each made for the same site, each at
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

**This package is Tsunagi.** The demos of all twenty-two share one header and footer, so each links the rest.
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
pnpm pictures       # take the README's two pictures from the built demo
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The commands are under [Development](#development).

Please follow the [code of conduct](./CODE_OF_CONDUCT.md). A way to make the check or the solver run for long, or markup that gets out of the drawing, is for the [security policy](./SECURITY.md), not a public issue.

## Changes

See [CHANGELOG.md](./CHANGELOG.md).

## Licence

MIT, © John Morris. The levels are part of the package and under the same licence.
