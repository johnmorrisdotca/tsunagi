# Drawing a board

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

A custom board is a look of colours: `{ paper: "#fbf8f1" | ["#f0cf95", "#d3a662"], frame, grid, ink, coordinate }`, and every colour is also a custom property on `.tsunagi` (see [Theming](../README.md#theming)). The parts of the drawing carry classes and data attributes (`tsu-marble`, `tsu-line`, `tsu-wall`, `tsu-bridge`, `tsu-portal` and the rest) to style or find them, and a drawing is made of groups a page can redraw one pair at a time, so a finger moving through a cell redraws one or two pairs and not the whole of a 30×30 board. `drawTsunagiCode(givens, size, options)` draws a level from its code, `drawTsunagiMarble(pair, options)` one marble for a legend, and `tsunagiGeometry(layout)` and `cellAtPoint(geometry, x, y)` say where every cell is and which cell a point is over. All the classes, the groups and the measurements are in [docs/DRAWING.md](./DRAWING.md). Nothing in the drawing can be selected, dragged or double-tapped into a selection, and with reduced motion asked for nothing moves.

