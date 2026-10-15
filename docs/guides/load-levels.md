---
title: Load levels and identify boards
section: how-to
order: 2
description: Load levels by size, check a board on the server without its answer, and keep numbers and codes stable.
---

## Import one size or load lazily

Direct levels-4 through levels-30 entries contain layout/answer rows for the supported sizes. The levels entry loads a size on demand; await loadTsunagiLevels before tsunagiLevelsOf or tsunagiLevelOf. Portal levels use their own set.

```ts
import {loadTsunagiLevels,tsunagiLevelOf} from "@johnmorrisdotca/tsunagi/levels";
const levels = await loadTsunagiLevels(4);
console.log(levels.length,tsunagiLevelOf(4,levels[0][0]));
```

## Server checks without shipping answers

The layouts entry supplies boards alone, by size and level order. A server can identify a known board and validate a submitted answer without importing every answer. checkTsunagiAnswer checks rules; collection membership is a separate question. Marks and teaching roles are separate small metadata entries.

## Preserve numbers and codes

Store size, set and original layout with a record. A seed encodes set/level only through levelSeed/setOfSeed; it is not random puzzle generation. Preserve old-to-new level mappings when applying a documented renumbering. [Migration](upgrading.md) explains the historical map.
