# Playing a board in a page

How `mountTsunagi` and `<tsunagi-board>` are played, and what is under the board. The options are in the [README](../README.md#playing-it-in-a-page).

It plays the way the site does. Press a marble (or the end of a line) and drag to
its partner; drag back over a line to shorten it, cell by cell; tap a marble to
clear its line; a line dragged into another cuts the other back. Drag into a
portal and the line goes in and comes out of the other ring in the same drag, and the finger is
taken to be over the end of the line from then on (`dragFinger`, `Reach`): move it a cell and the
line moves a cell, where it now is; where that would take the finger off the board, lift it and press
the end of the line again. Drag back over the portal and the line is as it was before it. Pointer events,
captured on the press so a drag that leaves the board still ends, with
`touch-action: none` so a finger drawing a line never scrolls the page. A big
board (10×10 up) is looked at through a box with a zoom and move pad, the wheel,
and the box's edge, which moves the view while a line is dragged near it. The box
keeps one steady square, and the lines of words under it keep the room they need,
so nothing moves as lines are drawn or messages come and go.

Under the board, unless `controls: false`: **Undo**, **Restart**, **Check** (the
marbles of pairs not joined flash, and it says how many) and, if `cheats` is on and
the level has an `answer`, **Cheat**, which draws one unfinished line and marks the
solve *helped*; a line of progress; and the lines a level's twists ask for: strokes
left of a limit, the count to the next explosion, what the last explosion did. `chips`
adds a row with the level's difficulty (1 to 5) and a chip for each challenge on it,
pressed to say what it means. Everything a button does is also a method on the
handle (`undo`, `restart`, `check`, `cheat`, `fit`, `load`, `set`, `destroy`).

