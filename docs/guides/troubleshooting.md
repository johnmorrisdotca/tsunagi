---
title: Troubleshooting and FAQ
section: troubleshooting
order: 9
description: Find out why a board or progress is null, why no result is not a proof, and why a level set is missing or a board will not play.
---

## Layout or progress returned null

Check board size, cell count, paired labels, suffix ordering and valid native twists. decodeLayout/newTsunagiGame refuse malformed setup. linesOfAnswer/decodeLines refuse broken or conflicting lines. mountTsunagi can return null for invalid input. Pointer cellAtPoint null means outside playable cells, not a parse error.

## No result is not a proof

Generators can return null for unsuccessful bounded attempts. A solver gaveUp flag means its count is inconclusive. measureLevel/measureSolved reject invalid layouts/answers. Cheat null means no unfinished line; explosionAfter null means this stroke caused no explosion. Help null means no assistance, and absent stroke/explosion limits also use null.

## A collection seems missing

Await loadTsunagiLevels for the requested size/set before synchronous lookup. tsunagiLevelOf null means no matching loaded level, firstUnsolved null means all solved, and role/mark null means metadata absent. Portal levels have their own counts. Use the requested native set consistently.

## The board does not respond

Register a custom element and mount it in a browser. Check controls, invalid attributes, out-of-strokes and game-over state. grid is puzzle size; size is display size in embeds. Call destroy on unmount. The [embed guide](../embeds.md) and [drawing guide](draw-and-embed.md) document native setup and events.
