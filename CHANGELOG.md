# Changelog

All notable changes to this project are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/). Every level keeps its number, its
board and its answer, so a solve kept by any version is still the same solve.

## [Unreleased]

## [1.3.0] - 2026-10-01

Nothing that was exported has changed: every export, every level, every board
code and every answer is as it was. New: a level of the day, and a README that
covers the package whole.

### Added

- **A level of the day.** `dailyTsunagiLevel(size, date)` names one level of a
  size for a date, the same for everybody on every machine, with no server and
  no seed: the levels are fixed, so the day is all it needs. A day is counted
  in UTC and each size has a level of its own. Every level of a size comes up
  once before any comes up again (128 days at 13×13, 256 at 7×7). Also
  `tsunagiDay(date)` (a date or its text, as `YYYY-MM-DD`), `isTsunagiDay(text)`
  and `TSUNAGI_DAILY_STRIDE`. The demo has a **Today** button beside the
  level arrows.
- **The words of the board in Japanese, listed.** `docs/strings-ja.md` shows
  every string of `TSUNAGI_STRINGS` beside its Japanese, made by
  `pnpm docs:make` and held to the source by a test.
- **The README is the family's outline**: Features, Use it in your project (the
  API alone, one tag, React, Vue, Svelte and Angular), Theming (every custom
  property with its light and dark value), Limits, Browser support, Languages, Roadmap,
  Where it comes from, the family of sixteen packages, Contributing and
  Changes, held to the code by tests.
- **`pnpm test:frameworks`** builds the README's React, Vue, Svelte, Angular and
  plain-page examples from the packed tarball and plays a level in each, in
  Chromium and WebKit.
- An *Add my project* issue template, a pull request template, and a copy of
  the family's `SECURITY.md` and `CODE_OF_CONDUCT.md` kept in `scripts/community`
  and held equal by a test.

### Changed

- **The demo's settings heading "Help" is now "Assists"** (「補助」), so it no
  longer shares a name with the family header's Help switch.
- The changelog is in the Keep a Changelog format, and `package.json`'s
  `homepage` is the demo.
- The README and `CONTRIBUTING.md` say Node 22 or later, which is what CI tests.
- The README's two pictures are taken again from the current demo.

## [1.2.0] - 2026-10-01

Nothing that was exported has changed: every level from 4×4 to 12×12 is the same
board with the same answer at the same number, so a solve kept by an older
version is still the same solve. New: 13×13, 14×14 and 15×15.

### Added

- **384 new levels**: 128 each at 13×13, 14×14 and 15×15, in blocks of sixteen
  and ordered easiest first by the same measure as every other size, each proved
  on every build to have exactly one answer. `@johnmorrisdotca/tsunagi/levels-13`,
  `/levels-14` and `/levels-15`; `TSUNAGI_SIZES` and `TSUNAGI_LEVEL_COUNTS` list
  them, and `TSUNAGI_MARKS` rates them. Every board has at most sixteen lines,
  the most colours there are. Each block's 15th and 16th are its twist, as at
  12×12: bridges, walls, waypoints, explosions and a stroke limit at all three
  sizes, wrap at 13×13, a hexagon at 13×13 and 15×15. At 14×14 and 15×15 the
  block that would teach wrap, and the last, are plain boards: no wrapped board
  of at most sixteen lines with one answer turned up in fifty seeded jobs of the
  generator at either size.
- **Why 12×12 was the ceiling, and what lifted it.** The search of `solve.ts`
  grows each line from its first stone and looks at the board as a whole only
  when a line moves, so a cell with two ways left is not noticed until a line
  arrives beside it. On a board of fifteen long lines that is hopeless: at 13×13
  it gave up at 100,000 positions on nearly every board of sixteen lines or fewer,
  and at 15×15 on every one (measured on 1 October 2026). Writing the board as clauses and handing
  them to a solver that learns from each dead end (`sat.ts`, `solveSat.ts`)
  proves a 15×15 board in about half a second. A depth-first search with
  forced-move propagation of its own was tried between the two and was 7 times
  faster than the old search at 12×12 and no use at 15×15, so it is not here.
- **`countSolutionsSat(layout, limit, budget, guide)`**, and `countSolutions` is
  it from 13×13: `nodes` and `branches` then count the solver's decisions and
  dead ends, not search positions, and `budget` is a number of dead ends. From
  4×4 to 12×12 `countSolutions` is the search it always was, since those levels'
  difficulty marks are made from its counts. The solver agrees with it on every
  one of the 1,792 older levels and on about 600 other boards, 217 of them with
  several answers (twists taken off levels, or wrap put on), and `solveSat.test.ts`
  holds a smaller set of the same. The SAT solver itself is `sat.ts`, small and
  deterministic: the same board gives the same counts on every machine.
- **Finding the boards.** The generator's lines take their tightest way on 70%
  of the time (Warnsdorff's rule), which at 15×15 makes about 25 lines, and a
  board of more than sixteen cannot be written down. `FillingStyle`, an optional
  last argument of `randomFilling` and of every twist's `…Candidate`, sets how
  eagerly they do (`greed`, default 0.7, as it always was): at 1 the lines are
  longer and a 15×15 board has fourteen. Boards found at 0.7 to 1 are mixed.
- **Making them** is two scripts: `scripts/tsunagi-pool.ts` runs seeded jobs on
  every core (a job's boards depend on its number only) and
  `scripts/tsunagi-levels-big.ts` takes the recorded jobs and writes the files.
  13×13's and 14×14's plain boards take seconds and 15×15's about six minutes;
  with every twist the whole run was about an hour on twenty cores.
- The demo's size row has 13 to 15; the board's zoom and move pad, which starts at
  10×10, plays them on a phone.

## [1.1.0] - 2026-10-01

Nothing that was exported has changed: every export, every level and every
answer is as it was, and a solve kept by an older version is still the same
solve. New entry points, all additions.

### Added

- **`@johnmorrisdotca/tsunagi/draw`**: a board as SVG text, drawn as itsutsu.com
  draws it. Colours or numbers on the marbles, dots along the lines or the lines
  alone, four colour sets (`marble`, `bright`, `colour-blind`, `soft`) or your
  own, six boards (`paper`, `wood`, `green`, `blue`, `red`, `black`) or a look of
  your own, coordinates, flashing marbles for Check and a burst for an
  explosion. Bridges are drawn as bridges, the line going down passing under
  the deck and the one going across over it; waypoints as rings; a board that
  wraps with a ghost of the far edge all round it; a hexagon as a honeycomb.
  Also where every cell is in the drawing and which cell a point is over.
- **`@johnmorrisdotca/tsunagi/play`**: `mountTsunagi` draws a level into any
  element and plays it by touch and mouse: press and drag, drag back to
  shorten, tap a marble to clear, Undo, Restart, Check, Cheat, strokes left, the
  count to the next explosion, chips for the level's challenges, and the zoom
  and move pad for boards from 10×10 up. Events for every change, stroke,
  explosion and solve. English and Japanese.
- **`<tsunagi-board>`** (`/element`, `/element/define`): the same in a tag, with
  attributes for every option.
- **`game.ts`** in the main entry: a game in play as pure functions (`newTsunagiGame`,
  `pressGame`, `dragGame`, `liftGame`, `undoGame`, `restartGame`, `checkGame`,
  `cheatGame`), with explosions, stroke limits and help, usable on a server.
- The demo has a settings panel for every option, a preview of the level's block, the
  tag, and browser tests (`pnpm test:demo`) at a phone's width and a desk's.

## [1.0.1] - 2026-10-01

Nothing that was exported has changed.

### Added

- An API reference page, `api.html` on the demo site: every export of every
  entry point with its signature and its doc comment, made from the source
  when the site is built, so it cannot fall behind the code. The README and
  the demo's header link to it, and a test holds it to the source.

### Changed

- The family's footer lists Jarajara.

## [1.0.0] - 2026-10-01

The first release: Tsunagi as played at itsutsu.com, taken out of the site into
its own package.

### Added

- Layouts and answers as codes; the rules a line keeps; drawing as a finger
  does it (press, drag, let go); a check a server can trust in O(cells).
- A solver that counts answers, a seeded generator, and the twists: walls,
  bridges, waypoints, wrap, hexagons, sparse boards, explosions and strokes.
- A difficulty measure, and 1,792 levels from 4×4 to 12×12, each its own
  import, every one proved on every build to have exactly one answer.

[Unreleased]: https://github.com/johnmorrisdotca/tsunagi/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/johnmorrisdotca/tsunagi/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/johnmorrisdotca/tsunagi/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/johnmorrisdotca/tsunagi/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/johnmorrisdotca/tsunagi/compare/155f236...v1.0.1
[1.0.0]: https://github.com/johnmorrisdotca/tsunagi/commit/155f236
