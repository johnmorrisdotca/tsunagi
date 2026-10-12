---
title: Codes, steps and native twists
section: explanation
order: 7
description: Learn codes, steps and native twists.
---

## Decode instead of guessing

Layout codes start with row-major cells, then ordered native suffixes. Pairs have two endpoints; blocked cells cannot hold a line. Walls block edges, bridges carry two straight different lines, waypoints require their own pair and wrapping joins opposite edges. Hex boards have native six-neighbour geometry. Portals step through a paired cell and continue in the same direction.

## One spelling preserves one board

Use decodeLayout/encodeLayout, layoutStep, stepTable and layoutNeighbours. Portal travel can cover cells beyond a simple adjacency pair, and bridges require special crossing ownership. Sparse, stroke and explosion suffixes constrain native gameplay. A hand-written generic four-neighbour walker would lose these rules.

## Answers differ from progress

Answer codes record the owning line for each cell; progress codes record partially drawn ordered lines. Use linesOfAnswer for a known solution and decodeLines against the original layout for resumed play. Validation can return null instead of guessing malformed input. [Gameplay](play-and-strokes.md) and [the reference](api:LinkLayout) cover the native shapes.
