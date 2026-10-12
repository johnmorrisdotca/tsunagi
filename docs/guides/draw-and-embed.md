---
title: Draw and embed a native board
section: how-to
order: 4
description: Learn draw and embed a native board.
---

## Draw SVG without mounting

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {drawTsunagiCode} from "@johnmorrisdotca/tsunagi/draw";
const svg = drawTsunagiCode(TSUNAGI_4[0][0],4,{marks:"numbers",coordinates:true});
console.log(svg.startsWith("<svg"));
```

The drawing entry returns SVG strings with named palettes/boards, colour or number marks, marbles or lines, coordinates and native highlights. Geometry maps cells to points and pointer positions back to cells; cellAtPoint null means outside playable geometry.

## Mount a playable board

```ts no-run
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {mountTsunagi} from "@johnmorrisdotca/tsunagi/play";
const host = document.createElement("div");
document.body.append(host);
const [givens,answer] = TSUNAGI_4[0];
const board = mountTsunagi(host,{size:4,givens,answer,controls:true});
console.log(board?.progress().pairs);
board?.destroy();
```

A handle can load levels, set presentation, undo, restart, check, cheat, fit and destroy. Destroy on unmount. Host callbacks retain native details, and custom elements register through element/define or defineBoard.

## Keep the embed contract

Use the builder for native element, iframe, module and framework recipes. grid selects board cells; size selects display size in the reflected embed settings. The [embed guide](../embeds.md) lists all attributes, structured getters, JSON-safe events and frame messages. Frames use URL setup and no storage; verify source/origin before accepting their messages.
