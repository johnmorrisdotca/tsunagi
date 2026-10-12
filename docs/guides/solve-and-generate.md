---
title: Solve and generate with a budget
section: how-to
order: 5
description: Learn solve and generate with a budget.
---

## Distinguish proof from exhaustion

countSolutions returns count, solutions and gaveUp within a limit and work budget. To prove uniqueness, seek at most two and require count === 1 with gaveUp === false. A count reached before budget exhaustion is not automatically a proof. countSolutionsOfLevel can guide search with a known answer; the SAT solver handles larger boards with its native encoding.

```ts
import {TSUNAGI_4} from "@johnmorrisdotca/tsunagi/levels-4";
import {decodeLayout,countSolutions} from "@johnmorrisdotca/tsunagi";
const result = countSolutions(decodeLayout(TSUNAGI_4[0][0],4)!,2,20000);
console.log(result.count,result.gaveUp,result.count === 1 && !result.gaveUp);
```

## Seed a bounded generation attempt

```ts no-run
import {candidate,seededRandom} from "@johnmorrisdotca/tsunagi";
const level = candidate(4,seededRandom(42),8,20000);
console.log(level?.layout ?? "No proved candidate in this attempt");
```

Generators return null when the requested attempt cannot produce and prove its candidate. Repaired/reduced candidates, sparse boards and twist-specific generators have their own constraints and budgets. Host loops should bound retries; increasing a budget can consume substantial work.

## Preserve fixed levels

A new candidate is not a published fixed level. Use the existing generation workflow to change collections and preserve their proofs, order and migrations. This documentation rollout refreshes generated comments only, leaving all boards and answers unchanged.
