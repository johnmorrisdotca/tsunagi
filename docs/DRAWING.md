# The drawing's parts

The classes, data attributes and groups of the SVG that `drawTsunagi` returns, for a page that styles it, finds a part of it or redraws a part of it. The options are in the [README](../README.md#drawing-a-board).

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
