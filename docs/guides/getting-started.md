---
title: Getting started
section: tutorial
order: 1
description: Install Tsunagi and check a bundled level's answer.
---

Join each pair with its own line and fill every playable cell. Tsunagi has fixed levels, native board codes, pure rules, bounded solvers and separate SVG/playable-board entries.

## Install

```sh
npm install @johnmorrisdotca/tsunagi
```

The typed ES modules run in Node 22 or later or modern browsers. The root does not need a DOM. Load one fixed-size collection when you need its boards and answers.

## Check a fixed answer

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {decodeLayout,checkTsunagiAnswer} from "@johnmorrisdotca/tsunagi";
const [givens,answer] = TSUNAGI_4[0];
console.log(decodeLayout(givens,4)?.ends.length);
console.log(checkTsunagiAnswer(4,givens,answer));
```

Levels are one-based in the public ladder and zero-based in the imported array. checkTsunagiAnswer validates the lines in linear time; it does not prove the supplied layout belongs to the published level collection. Keep the original givens when checking a submitted answer.

## Next steps

[Level collections](load-levels.md), [pure gameplay](play-and-strokes.md), [drawing/embedding](draw-and-embed.md), [solving/generation](solve-and-generate.md), [daily ladders](daily-and-ladder.md) and the [reference](entry:main) cover the APIs.
