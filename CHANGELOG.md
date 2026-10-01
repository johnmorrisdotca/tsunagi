# Changelog

## 1.1.0 — 2026-10-01

Nothing that was exported has changed: every export, every level and every
answer is as it was, and a solve kept by an older version is still the same
solve. New entry points, all additions.

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

## 1.0.1 — 2026-10-01

Nothing that was exported has changed.

- An API reference page, `api.html` on the demo site: every export of every
  entry point with its signature and its doc comment, made from the source
  when the site is built, so it cannot fall behind the code. The README and
  the demo's header link to it, and a test holds it to the source.
- The family's footer lists Jarajara.

## 1.0.0 — 2026-10-01

The first release: Tsunagi as played at itsutsu.com, taken out of the site into
its own package.

- Layouts and answers as codes; the rules a line keeps; drawing as a finger
  does it (press, drag, let go); a check a server can trust in O(cells).
- A solver that counts answers, a seeded generator, and the twists: walls,
  bridges, waypoints, wrap, hexagons, sparse boards, explosions and strokes.
- A difficulty measure, and 1,792 levels from 4×4 to 12×12, each its own
  import, every one proved on every build to have exactly one answer.
