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
board (10×10 up) is looked at through a box with a zoom and move pad, the wheel
(it zooms; at the end of the zoom it leaves the page to scroll), and the box's edge, which moves the view while a line is dragged near it. The box
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

## The options of `mountTsunagi`

Moved here from the README's "Playing it in a page".

| Option | What it does |
| --- | --- |
| `size`, `givens`, `answer`, `level`, `set` | the level (`set`: `classic`, the default, or `portals`); `answer` is needed for Cheat and makes a solve the stored answer |
| `lines` | lines to start from: a kept game (`decodeLines`) or a solved board to show |
| `marks`, `fill`, `colours`, `board`, `coordinates` | the look, as for `drawTsunagi`; change them with `set` and they take effect at once |
| `explosions` | `on` (default), `soft` (a boom for a blast, half as often) or `off`; a solve with either help is `helped` |
| `cheats` | offer Cheat |
| `controls`, `chips`, `zoom` | the buttons and words (default on), the chips (default off), and the pad: `auto` from 10×10, `on`, `off` |
| `language` | `en` or `ja`; left out, the host's `lang` or the page's, and it follows the page's |
| `onChange`, `onStroke`, `onExplosion`, `onSolve` | callbacks, and the same four as DOM events on the host: `tsunagi-change`, `tsunagi-stroke`, `tsunagi-explosion`, `tsunagi-solve`. Each `detail` has `lines`, `code` (to keep the game), `progress`, `answer` and `helped` |
