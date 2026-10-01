# Tsunagi's words, in English and Japanese

Made from `src/strings.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.

**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please
open a *Fix a translation* issue with the string's name. `{name}` and the other braces are filled in when shown. A line
with `One` at the end of its name is the singular, said in English when the count is 1.

| Name | English | Japanese |
| --- | --- | --- |
| `board` | Tsunagi board, {size} by {size} | つなぎの盤、{size}×{size} |
| `boardHex` | Tsunagi board of hexagons, {size} across | 六角形の盤、一辺{size}マス |
| `marble` | marble {n}, row {row}, column {col} | 玉{n}、{row}行{col}列 |
| `undo` | Undo | 元に戻す |
| `restart` | Restart | やり直す |
| `check` | Check | 確かめる |
| `cheat` | Cheat | ヒント |
| `cheatTitle` | Draws one unfinished line. A solve that used it counts as helped. | 未完成の線を一本引きます。使った解答は、助けを借りたものとして数えます。 |
| `hint` | Press a marble and drag to its partner. Drag back to shorten a line; tap a marble to clear it. | 玉を押して、相手の玉までなぞります。線の上を戻ると短くなり、玉をタップすると線が消えます。 |
| `progress` | {joined} of {pairs} joined · {percent}% of the board | {pairs}組中{joined}組がつながっています・盤の{percent}% |
| `fullButEmpty` | Every pair joined; {n} cells are still empty. | すべての組がつながりました。空きマスが{n}つ残っています。 |
| `solved` | Solved. Every pair is joined and every cell is filled. | 解けました。すべての組がつながり、すべてのマスが埋まりました。 |
| `strokesLeft` | {left} of {limit} strokes left. | 残り{left}筆（全{limit}筆）。 |
| `outOfStrokes` | Out of strokes. Restart to try again. | 筆数がなくなりました。やり直してもう一度どうぞ。 |
| `boomIn` | An explosion in {n} strokes. | あと{n}筆で爆発します。 |
| `boomNext` | The next stroke sets off an explosion. | 次の一筆で爆発します。 |
| `boom` | Boom! A line was cut back to half. | ドカン！線が半分に切られました。 |
| `blast` | Blast! A line was wiped, and the one beside it cut back to half. | バーン！線が一本消え、隣の線も半分に切られました。 |
| `checkMissing` | {n} pairs are not joined yet: their marbles are flashing. | まだつながっていない組が{n}つあります。その玉が光っています。 |
| `checkEmpty` | Every pair is joined; {n} cells are still empty. | すべての組がつながりました。空きマスが{n}つ残っています。 |
| `helpExplosionsOff` | Explosions are off: a solve counts as helped. | 爆発なし：解いても、助けを借りたものとして数えます。 |
| `helpExplosionsSoft` | Explosions are softened: a solve counts as helped. | 爆発をやわらげています：解いても、助けを借りたものとして数えます。 |
| `helpCheated` | Cheat has been used: a solve counts as helped. | ヒントを使いました：解いても、助けを借りたものとして数えます。 |
| `zoomLabel` | Move and zoom the board | 盤の移動と拡大 |
| `zoomIn` | Zoom in | 拡大 |
| `zoomOut` | Zoom out | 縮小 |
| `fit` | Fit | 全体 |
| `up` | Up | 上へ |
| `down` | Down | 下へ |
| `left` | Left | 左へ |
| `right` | Right | 右へ |
| `difficulty` | Difficulty | 難しさ |
| `difficultyOf` | {n} of 5 | 5段階中{n} |
| `difficultySays` | How hard this level measured among this size's levels: its corners, the guessing it asks for, the cells you cannot fill by forced moves, and its longest line. | 同じ大きさのレベルの中での難しさです。角の数、当てずっぽうが必要な度合い、順に決まらないマス、いちばん長い線から測っています。 |
| `teaches` | New: {what} | 新登場：{what} |
| `teachesSays` | This block's new idea: its 15th level shows it gently. | このまとまりの新しい仕掛け。15番目のレベルでやさしく出てきます。 |
| `tests` | Block's test | まとまりの試験 |
| `testsSays` | This block's test: its 16th level uses its twist hard. | このまとまりの試験。16番目のレベルで仕掛けを強く使います。 |
| `bridges` | Bridges | 橋 |
| `bridgesSays` | A bridge is crossed by two lines: one straight across, a different one straight down. Neither may turn on it, and both must cross. | 橋は二本の線が交わる場所です。一本はまっすぐ横に、別の一本はまっすぐ縦に通ります。橋の上で曲がることはできず、両方通す必要があります。 |
| `walls` | Walls | 壁 |
| `wallsSays` | No line may cross a wall, or go into a blocked cell. | 壁を越える線も、ふさがれたマスに入る線もできません。 |
| `waypoints` | Waypoints | 中継点 |
| `waypointsSays` | A ring on a cell is a waypoint: the line of its colour must pass through it, and no other line may. | マスの上の輪は中継点です。同じ色の線はここを必ず通り、ほかの線は通れません。 |
| `wrap` | Wrap | 巡る盤 |
| `wrapSays` | The edges join: a line leaving one side comes back in on the other. Drag off an edge onto its faded copy, then carry on from the line's end on the far side. | 盤の端がつながっています。一方の端から出た線は、反対の端から入ってきます。端の外にある薄い写しへなぞり、反対側の線の端から続けてください。 |
| `explosions` | Explosions | 爆発 |
| `explosionsSays` | Every few strokes, a drawn line is broken: cut back to half, or on the hardest boards wiped with a line beside it cut too. The count under the board says when the next one goes off. The same strokes always break the same line, and the stroke that solves the level sets nothing off. | 数筆ごとに、引いた線が壊れます。半分に切られるか、難しい盤では一本が消えて隣の線も切られます。次の爆発までは盤の下の数でわかります。同じ筆づかいなら同じ線が壊れ、解いた一筆では爆発しません。 |
| `strokes` | Stroke limit | 筆数の制限 |
| `strokesSays` | Only so many strokes: every time you lift your finger having changed the board, one is spent, and Undo gives none back. Run out before it is solved and Restart gives you them all again. | 使える筆数が決まっています。盤を変えて指を離すたびに一筆使い、元に戻しても戻りません。解く前に使い切ったら、やり直すと全部戻ります。 |
| `sparse` | Few lines | 線が少ない盤 |
| `sparseSays` | Fewer pairs than a board this size usually has, so each line is long and has far to go. No new rule: the distance is the difficulty. | この大きさにしては組が少ないので、一本一本の線が長くなります。新しいルールはなく、距離が難しさです。 |
| `hexagon` | Hexagon | 六角形 |
| `hexagonSays` | A honeycomb: every cell has six neighbours, so a line may run up and down, side to side, and along both slants. | ハチの巣の形です。どのマスにも隣が六つあり、縦、横、そして両方の斜めに線が通れます。 |
