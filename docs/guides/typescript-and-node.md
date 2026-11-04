---
title: TypeScript and Node
section: how-to
order: 15
description: Use the package's types, and run the rules on a server with no DOM.
---

The package ships its own types, for each entry point. The rules are plain functions over strings and numbers, so the same call gives the same answer in Node, Deno, Bun, a worker and a browser. This file type-checks, then runs under Node 22.18 or later, which strips the types.

```ts
import { checkTsunagiAnswer, type TsunagiCheck } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const [givens, answer] = TSUNAGI_6[11]!; // level 12
const check: TsunagiCheck = checkTsunagiAnswer(6, givens, answer);
console.log(check.ok, TSUNAGI_6.length);

// @ts-expect-error a list of levels is not a number
const wrong: number = TSUNAGI_6;
console.log(typeof wrong);
```

`@ts-expect-error` is there to show that the compiler refuses the wrong type.

## On a server

A server needs no DOM. It checks what the player sent against the same rules.

```mjs
// A server checks an answer with the same rules the board plays by: pure functions, no DOM, no browser globals.
import { checkTsunagiAnswer, dailyTsunagiLevel } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const today = dailyTsunagiLevel(6, new Date()); // the level of the day at 6×6: 1 to 256
const [givens, answer] = TSUNAGI_6[today - 1]; // send givens to the browser; keep the answer
console.log(checkTsunagiAnswer(6, givens, answer), TSUNAGI_6.length); // { ok: true } 256
```

See [getting started](getting-started.md) for mounting the board in a page.
