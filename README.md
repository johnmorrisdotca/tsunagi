<h1 align="center">Tsunagi <sub>つなぎ</sub></h1>

<p align="center"><strong>A line-joining logic puzzle for JavaScript and TypeScript.</strong><br>
Join each pair of marbles with a line, every line its own, until the board is full. Layouts and answers as short codes, the rules a line keeps, a solver that counts answers, a seeded generator, walls, bridges, waypoints and hexagon boards, a difficulty measure, and 1,792 levels from 4×4 to 12×12, each proved to have exactly one answer. No dependencies.</p>

<p align="center">
  <a href="https://github.com/johnmorrisdotca/tsunagi/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/johnmorrisdotca/tsunagi/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/@johnmorrisdotca/tsunagi"><img alt="npm" src="https://img.shields.io/npm/v/@johnmorrisdotca/tsunagi?color=2f5d4a"></a>
  <a href="./LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-2f5d4a"></a>
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-0-2f5d4a">
</p>

<p align="center"><a href="https://johnmorrisdotca.github.io/tsunagi/"><strong>Play a level →</strong></a></p>

<p align="center">
  <img src="docs/desktop.jpg" alt="A 7×7 level solved: seven pairs of coloured marbles, each joined by a line of its colour, every cell of the board filled" width="620">
  <img src="docs/phone.jpg" alt="A 6×6 level half drawn on a phone in dark mode, three lines down and three pairs still to join" width="200">
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

## Who it is for

- **Puzzle sites and apps** that want Tsunagi with the rules already right:
  fixed levels everybody plays alike, a check a server can trust in O(cells),
  and the drawing a finger does (press, drag, let go) as pure functions.
- **Anyone making line puzzles of their own**, who wants a solver that counts
  answers, a generator that makes boards with exactly one, and the twists
  (walls, bridges, waypoints, a board that wraps, hexagons) to vary them.

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
- **Hexagons**, a board of six-sided cells, six ways round.
- **Sparse** boards, with fewer marbles and more room, and **explosions** and
  **strokes**, a limit on how a board may be drawn.

## Levels

```ts
import { loadTsunagiLevels, openTsunagiLevels, TSUNAGI_LEVEL_COUNTS } from "@johnmorrisdotca/tsunagi/levels";

const sevens = await loadTsunagiLevels(7);       // 256 levels, easiest first; only 7×7 is fetched
openTsunagiLevels(7, new Set([1, 2, 3]));         // 16: the first block of sixteen is open from the start
```

| Size | Levels | Size | Levels | Size | Levels |
| --- | --- | --- | --- | --- | --- |
| 4×4 | 192 | 7×7 | 256 | 10×10 | 128 |
| 5×5 | 256 | 8×8 | 256 | 11×11 | 64 |
| 6×6 | 256 | 9×9 | 256 | 12×12 | 128 |

Every level was made once by `scripts/tsunagi-levels.ts` and is proved again
on every build: solved from scratch, it must have exactly one answer, the one
stored, filling every cell, with no two levels the same board turned or
mirrored. Levels come in blocks of sixteen, each block no easier on average
than the one before, the fifteenth and sixteenth its twist; a block opens
once every level of the one before is solved. `TSUNAGI_MARKS`
(`@johnmorrisdotca/tsunagi/marks`) rates every level 1 to 5 from its measured
difficulty.

| Import | What it holds |
| --- | --- |
| `@johnmorrisdotca/tsunagi` | everything below but the boards themselves |
| `@johnmorrisdotca/tsunagi/levels` | `loadTsunagiLevels(size)`, `loadEveryTsunagiLevel()`, `tsunagiLevelsOf(size)`, `tsunagiLevelOf(size, layout)`, each size fetched only when loaded |
| `@johnmorrisdotca/tsunagi/levels-4` … `/levels-12` | one size's levels, `TSUNAGI_4` … `TSUNAGI_12`, as `[layout, answer]` pairs |
| `@johnmorrisdotca/tsunagi/marks` | `TSUNAGI_MARKS` (each level's 1 to 5) and `TSUNAGI_ROLES` (each twist level's part in its block) |
| `@johnmorrisdotca/tsunagi/renumbered` | where each old level went when the levels were renumbered on 2026-09-26, for anyone who stored solves by number |

## API

| Export | What it does |
| --- | --- |
| `decodeLayout(code, size)`, `encodeLayout(cells, walls, more)` | a layout's code and the `LinkLayout` it stands for: marbles (`ends`), cells, walls, waypoints, wrap, hexagon |
| `encodeAnswer(owners)`, `answerOf(layout, lines)`, `linesOfAnswer(layout, answer)` | an answer as a code: a letter for each cell's line, `#` blocked, `+` a bridge |
| `checkTsunagiAnswer(size, layout, answer)` | whether an answer joins every pair as the rules allow, in O(cells); `{ ok: true }` or the first reason it does not |
| `noLines`, `pressAt`, `dragTo`, `dragThrough`, `letGo` | drawing, as a finger does it: each takes the lines drawn so far and returns new ones |
| `joined`, `allJoined`, `unjoinedPairs`, `filled`, `ownersOf` | what the lines drawn so far amount to |
| `encodeLines`, `decodeLines` | lines half drawn, as a code, to keep a game and come back to it |
| `countSolutions(layout, limit, budget)` | counts answers up to `limit`, within a `budget` of search steps, and returns one |
| `candidate`, `repairedCandidate`, `sparseCandidate`, `layoutOf` | a new board from a seeded `Random`: a random filling of lines, cut back to its ends |
| `bridgeCandidate`, `wallCandidate`, `waypointCandidate`, `wrapCandidate`, `hexCandidate`, `bridgeAndWallCandidate` | a board with a twist |
| `measureLevel`, `difficultyScores`, `orderByDifficulty` | how hard a board is: corners, guessing, cells not forced, its longest line |
| `challengesOf`, `isTwist`, `twistRole`, `tsunagiMarks` | what a layout asks of a player, and a level's mark |
| `transformed`, `relettered`, `symmetryKey` | a board turned, mirrored and relettered, and one key for all eight |
| `cheatLine(layout, lines, answer)` | one line of the answer drawn in, for a player who asks for help |
| `seededRandom(seed)` | the mulberry32 stream every generator draws from |
| `openTsunagiLevels`, `nextTsunagiLevel`, `firstUnsolvedTsunagiLevel`, `tsunagiBand` | which levels a player may open, which comes next, and which third of a size a level is in |

Every function is pure: it returns new values and never changes what it was
given.

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

## Architecture

The rules, the solver and the generator are plain functions over short codes,
with no DOM. Each size's levels is an entry of its own, so a page loads only
the size it shows.

```text
src/
├── index.ts          the main entry: everything below but the levels themselves
├── code.ts           layouts and answers as short codes, and the board each stands for
├── steps.ts          where a line may go next on a board: walls, bridges, wrap, hexagons
├── lines.ts          the lines a player has drawn, and what a press and a drag do to them
├── check.ts          whether an answer joins every pair as the rules allow
├── solve.ts          the solver, which counts a board's answers up to a limit
├── generate.ts       new boards from a seed: lines laid at random, cut back to their ends
├── twists.ts         boards with a twist: walls, bridges, waypoints, wrap, hexagons
├── sparse.ts         sparse boards: few marbles and long lines
├── explosions.ts     explosions that break a line, and a limit on strokes
├── difficulty.ts     how hard a level is, measured from its board and its answer
├── ladder.ts         what a level asks of a player, read from its board
├── ladder.types.ts   the challenges a board can have
├── cheat.ts          one line of the answer drawn in, for a player who asks for help
├── levels.ts         the "/levels" entry: each size's levels, loaded when asked
├── levelCounts.ts    how many levels each size has
├── levelBlocks.ts    levels in blocks of sixteen, and which a player may open
├── renumber.ts       a record kept by level number, moved to the numbers levels have now
├── levels.suite.ts   the proof each size's levels test runs: one answer, the one stored
├── random.ts         the seeded random numbers every board is made from
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
    ├── marks.data.ts       every level's difficulty, 1 to 5, and each twist's part in its block
    └── renumbered.data.ts  where each old level went when the levels were renumbered
```

Tests sit beside the code they test (`*.test.ts`, one `levels.<size>.test.ts`
a size). `scripts/` makes the levels and the twists, builds the demo and checks
the package as npm packs it; `demo/` is the playable page.

## The name

*Tsunagi* (繋ぎ) is Japanese for "joining", "a link": what holds two things
together. It comes from the verb *tsunagu* (繋ぐ), to tie, to connect, to hold
hands, and is said in three beats, *tsu-na-gi*. In the puzzle every pair of
marbles is joined by its own line, and the lines together fill the board.

## Development

```sh
pnpm install
pnpm check          # lint, types and every test, every level proved again
pnpm test:package   # pack, install and import it as somebody who installed it would
pnpm site           # build the demo into site/, as the Pages workflow publishes it
```

## Licence

MIT, © John Morris. The levels are part of the package and under the same licence.
