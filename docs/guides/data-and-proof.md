---
title: Level data and proof workflow
section: explanation
order: 8
description: Learn level data and proof workflow.
---

## Keep data separate from rules

The root supplies codes, solvers, generation, gameplay and metadata. Level rows are imported size by size; layouts-only, marks and renumbering entries serve different jobs without requiring every answer. Fixed levels retain their board codes and numbers across this documentation update.

## Keep the writer authoritative

The existing level scripts generate candidates, verify uniqueness and difficulty, preserve played boards and write ordering/migration data where required. They now share tsunagi-level-docs.ts for import examples. Its --refresh operation updates only comments from the same writer; it does not search for boards or reorder them.

## Verification has different questions

An answer checker tests legal lines, a solver establishes solution count within a budget, level tests prove shipped rows, and a membership lookup identifies an approved board. Keep those claims separate in host flows. The [architecture tree](../ARCHITECTURE.md) preserves the complete source layout and the [README](../../README.md) retains measured generation details.
