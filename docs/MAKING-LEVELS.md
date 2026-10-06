# Making levels

How the package's fixed levels were made, and how to make more. The summary is in the [README](../README.md#making-levels).

```sh
node scripts/tsunagi-levels.ts 7              # 7×7 again: its twists placed, its marks measured, every board kept at its number
node scripts/tsunagi-levels.ts --grow 10      # 10×10 grown to whole blocks of sixteen and reordered, easiest first
```

The script finds boards with a seeded generator, keeps those the solver proves
have one answer, drops any that is another turned or mirrored, measures and
orders them, and writes the size's file, its marks and its twists. Seeded, so
the same run writes the same files. A board already published keeps its
number unless a size is grown, and then `/renumbered` says where each old
level went.

13×13 to 15×15 are made in two steps, because their boards are found by the
thousand on every core of a desk: `node scripts/tsunagi-pool.ts 15 plain 300`
runs seeded jobs in parallel (`plain`, or a twist: `bridge`, `walls`, `wrap` …)
and keeps each board proved to have one answer and measured, and
`node scripts/tsunagi-levels-big.ts` takes the jobs recorded in it and writes
the files. A job's boards depend only on its number, never on the machine.
The plain boards of 13×13 and 14×14 take seconds and 15×15's about six minutes
on twenty cores; the twist boards take longer, about an hour in all. Boards from 13×13
to 15×15 have at most sixteen lines, the most colours there are, and are proved by
`countSolutionsSat`: 12×12 was the ceiling until a solver that learns from its
dead ends replaced the one that walks into them again.

20×20, 25×25, 30×30 and the portal levels are made the other way round, because a board
that big with that few lines is almost never found by luck and never mended in a
useful time: `node scripts/tsunagi-reduce-pool.ts 30 plain 200` starts each board from a
filling cut into pieces of four cells and joins neighbours while the solver, started from the
filling's own answer, can still prove one answer within a budget of dead ends (the job's
number sets the budget, 3,000 to 50,000: the bigger, the fewer lines and the harder the board),
and keeps boards of at most 82 lines. `node scripts/tsunagi-levels-huge.ts` and
`node scripts/tsunagi-levels-portals.ts` take the pools and write the levels, the marks and the
twists. `node scripts/tsunagi-layouts.ts` then writes the layouts alone, which `layouts.test.ts` holds to the levels.

Measured on one core of a desk, 2026-10-05, six attempts each: a 20×20 takes a median 3.4 seconds
(range 1.3 to 7), a 25×25 10.9 (7 to 18) and a 30×30 24.5 at a budget of 6,000 (four attempts in six end
in a board of at most 82 lines) or 66 at 25,000; with two portals 20×20 takes 3.6, 25×25 9.2 and 30×30
44.7 seconds. Each board is then proved from its own answer in a fraction of a second to about a
second. A 30×30 that wraps is the hardest to make, since every cell has four neighbours: it needs a
budget of 200,000, about five minutes, and one attempt in three or four yields a board of 82 lines or
fewer. The pools the fixed levels were chosen from took roughly an hour and a half of a twenty-core desk
for 30×30 and under an hour for the other two sizes together.

