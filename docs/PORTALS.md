# Levels with portals

How portals are written, how the second set of levels is made, and the rules a portal keeps. The summary is in the [README](../README.md#levels-with-portals).

A portal is two rings inside the board: a line that goes into one comes out of the other, going
the same way on, and both rings are cells it fills. They are written after the cells and the walls,
`|portals3-40,17-52` (each pair as its two cells, the smaller first, the pairs in order, after `wrap` if
there is one), and a second set of levels is made of boards with them: 32 a size at 5×5 to 10×10, 12×12
and 15×15, in two blocks of sixteen, the first block's boards with one portal and the second's with two
or three. They open a block at a time like the others and are numbered from 1 in their own set;
a record that keeps a level by one number keeps a portal level as `levelSeed("portals", n)`, 1,000 and
its number (`setOfSeed` reads it back), which no level of the first set reaches.

The rules a portal keeps are small, and `checkTsunagiAnswer` holds every one. A portal cell is an empty
cell: never a stone, a waypoint, a bridge or blocked, never beside another portal's, and a board with portals
has no bridges and is no hexagon. A line steps into a portal cell and comes out of the other, going the same
way on, into the cell beyond it: where that cell is off the board, blocked, across a wall or a stone of another
pair, that way into the portal is no way. The two portal cells are one line's, and the portal is gone
through once; where two ways through portals (or a portal and a plain step) would join the same two cells,
the layout is refused (`decodeLayout` returns null), because an answer's cells could not tell them apart.

