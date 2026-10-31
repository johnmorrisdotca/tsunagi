# Making levels

How the package's fixed levels were made, and how to make more. The summary is in the [README](../README.md#making-levels).

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
twists. `node scripts/tsunagi-layouts.ts` then writes the layouts alone, which `layouts.test.ts` holds to the levels.

Measured on one core of a desk, 2026-10-05, six attempts each: a 20×20 takes a median 3.4 seconds
(range 1.3 to 7), a 25×25 10.9 (7 to 18) and a 30×30 24.5 at a budget of 6,000 (four attempts in six end
in a board of at most 82 lines) or 66 at 25,000; with two portals 20×20 takes 3.6, 25×25 9.2 and 30×30
44.7 seconds. Each board is then proved from its own answer in a fraction of a second to about a
second. A 30×30 that wraps is the hardest to make, since every cell has four neighbours: it needs a
budget of 200,000, about five minutes, and one attempt in three or four yields a board of 82 lines or
fewer. The pools the fixed levels were chosen from took roughly an hour and a half of a twenty-core desk
for 30×30 and under an hour for the other two sizes together.

## One generator for every board

`generateTsunagi(board, random, options)` makes one level for any board, proved to have exactly one answer, or says it found none (`null`). It is the same code for every board, because it works on a board as a graph (`board.ts`):

```ts
import { generateTsunagi, seededRandom, squareBoard } from "@johnmorrisdotca/tsunagi";

const level = generateTsunagi(squareBoard(15), seededRandom(42), { warps: 2 });
console.log(level?.pairs);
```

| Board | Made by |
| --- | --- |
| a square, 3×3 up, its edges joined if `wrap`, with any `blocked` cells | `squareBoard(side, { wrap, blocked })` |
| wider or taller than it is square | `oblongBoard(wide, tall)` |
| a hexagon of any radius | `hexagonBoard(radius)` |
| a honeycomb a little taller than it is wide, for a phone held upright | `tallHexagonBoard(radius, extraRows)` |
| any outline; a hole in the middle reads as blocked cells | `shapedBoard(size, keep, { hex })` |

| Option | What it does |
| --- | --- |
| `warps` | how many marked warps (portals) to plant; not on a honeycomb |
| `bridges` | how many bridges to plant; not on a honeycomb, nor with warps |
| `waypoints` | how many waypoints to plant |
| `longest` | the longest a line may grow, in cells; default three times the board's longer side |
| `most` | the most lines the board may end with, else that path is dropped for another |
| `budget` | what one proof may spend before that path is dropped; default 20,000 |
| `mends`, `tries` | how many times a board is mended, default 60, and how many paths are tried, default 30 |

It does four things:

1. **Fill the board with one winding path, cut as it grows** (`windingLines`). The path takes the tightest way on; when the line it is drawing would touch itself or has run long enough, it is cut there and goes on from a cell beside its tip as the next line. A piece too short to be a line is handed to a line beside it, or the last few lines are taken back and grown again.
2. **Plant what was asked for** on those lines: warps, bridges, waypoints.
3. **Prove** the board has one answer, with `countSolutions`, the solver every level is proved by, and put it through `checkTsunagiAnswer`, the check every solve is put through.
4. **Mend a second answer by adding a pair**: the line through a cell the two answers disagree on is cut there, which adds a pair of stones the second answer cannot honour, and the board is proved again. A cut never falls beside a warp, a bridge or a waypoint.

**Why the path is cut as it grows, and not filled first and cut after.** A path made first through every cell runs beside itself almost everywhere, and a line may not, since a solve of it could not be read back. On 15×15 boards a whole path cut afterwards made about 33 lines however much it was shaken; a path cut as it grows makes about 15, and mending takes those to between 19 and 28.

**A board that is not a whole square** is still a square of cells in its code, with what is off it written `#` and the word `shape` (`A…#|shape`), so a 9×13 board is `decodeLayout(code, 13)`. What reads, solves and checks a level has not had to change, and no code written before shapes means anything new. `onTheBoard(layout, cell)` says whether a cell is on the board, and `tsunagiGeometry` and `drawTsunagi` draw it as big as it is, with `geometry.width` and `geometry.height` (a whole square's are the same).

**What it takes**, measured 2026-10-31 in Chromium on a desk, eleven seeds each, and with the processor slowed four times as a phone's is:

| Board | Median | Slowest | Median, slowed | Slowest, slowed | Lines |
| --- | --- | --- | --- | --- | --- |
| 3×3 | under 1 ms | 2 ms | under 1 ms | 1 ms | 2–3 |
| 7×7 | 1 ms | 5 ms | 2 ms | 19 ms | 5–8 |
| 10×10 | 42 ms | 177 ms | 177 ms | 769 ms | 9–15 |
| 13×13 | 27 ms | 181 ms | 114 ms | 777 ms | 13–19 |
| 14×14 | 56 ms | 359 ms | 287 ms | 1.8 s | 17–24 |
| 15×15 | 187 ms | 595 ms | 905 ms | 2.7 s | 19–28 |
| 9×13 | 11 ms | 26 ms | 61 ms | 149 ms | 10–16 |
| hexagon, radius 5 | 17 ms | 77 ms | 101 ms | 503 ms | 10–15 |
| hexagon, radius 7 | 186 ms | 537 ms | 1.0 s | 3.6 s | 14–25 |
| taller honeycomb, radius 5 | 32 ms | 157 ms | 174 ms | 1.0 s | 12–21 |
| 13×13, edges joined | 303 ms | 1.6 s | 1.5 s | 7.7 s | 17–23 |

Asked for at most sixteen lines (`most: 16`), a 13×13 is still made every time, and a 15×15 often is not within its tries, so a level script asking that keeps going with the next seed. Every seed in that table made a board.

The fixed levels stay as they are: every level keeps its number, its board and its answer, and the generator is not how they were made. A level of the ladder is still chosen from a pool by its measured difficulty.
