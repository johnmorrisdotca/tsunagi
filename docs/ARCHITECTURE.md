# Tsunagi's architecture

The source tree, file by file. A test (`src/architecture.test.js`) holds this tree to the files under `src/`, so it cannot fall behind the code. The summary is in the [README](../README.md#architecture).

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
    ├── layouts.data.ts     every level's board alone, for a server (made by scripts/tsunagi-layouts.ts)
    ├── marks.data.ts       every level's difficulty, 1 to 5, and each twist's part in its block
    └── renumbered.data.ts  where each old level went when the levels were renumbered
```

Tests sit beside the code they test (`*.test.ts`, one `levels.<size>.test.ts`
a size). `scripts/` makes the levels and the twists, builds the demo and its API reference page and checks
the package as npm packs it; `demo/` is the playable page, and `e2e/` its browser tests.

