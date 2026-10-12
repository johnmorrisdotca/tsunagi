---
title: Daily levels, blocks and assistance
section: how-to
order: 6
description: Learn daily levels, blocks and assistance.
---

## Choose the same UTC day

```ts
import {dailyTsunagiLevel,tsunagiDay,blockOf,tsunagiMarks} from "@johnmorrisdotca/tsunagi";
const day = tsunagiDay("2026-10-12");
const level = dailyTsunagiLevel(4,day);
console.log(day,level,level === null ? null : blockOf(level));
console.log(level === null ? null : tsunagiMarks(4,level));
```

Daily levels are fixed boards selected from the classic count, not random regenerated puzzles. The same size/date chooses the same board worldwide. dailyTsunagiLevel returns null for an unsupported size. Keep a historic date as YYYY-MM-DD when sharing a fixed daily challenge.

## Read native progression

The ladder uses blocks of sixteen. A block opens after the preceding block is completed, and firstUnsolvedTsunagiLevel chooses the first gap. The 15th/16th can teach/test twists. tsunagiMarks and tsunagiRole read metadata without loading answers.

## Record assistance honestly

TsunagiHelp distinguishes cheated, explosions-soft and explosions-off. strongestTsunagiHelp combines these when recording multiple solves; helpOpensNext answers whether assistance counts for progression. Check flags unfinished pairs rather than solving a line. Cheat requires its native option and a known answer. Do not erase assistance when storing progress.
