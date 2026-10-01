/**
 * THE WORDS A TSUNAGI BOARD SAYS, in English and Japanese: what a screen
 * reader hears of the drawing, the buttons and the lines under a playable
 * board, and what each challenge on a level means. Plain data, so a page can
 * read them, replace a few or add a language of its own beside these two.
 *
 * `{name}` in a line is a value filled in; a line `foo` that has a `fooOne`
 * beside it is said as `fooOne` when its `{n}` is 1.
 */
export type TsunagiLanguage = "en" | "ja";

export const TSUNAGI_STRINGS: Record<TsunagiLanguage, Record<string, string>> = {
  en: {
    board: "Tsunagi board, {size} by {size}",
    boardHex: "Tsunagi board of hexagons, {size} across",
    marble: "marble {n}, row {row}, column {col}",
    undo: "Undo",
    restart: "Restart",
    check: "Check",
    cheat: "Cheat",
    cheatTitle: "Draws one unfinished line. A solve that used it counts as helped.",
    hint: "Press a marble and drag to its partner. Drag back to shorten a line; tap a marble to clear it.",
    progress: "{joined} of {pairs} joined · {percent}% of the board",
    fullButEmpty: "Every pair joined; {n} cells are still empty.",
    fullButEmptyOne: "Every pair joined; {n} cell is still empty.",
    solved: "Solved. Every pair is joined and every cell is filled.",
    strokesLeft: "{left} of {limit} strokes left.",
    strokesLeftOne: "{left} of {limit} stroke left.",
    outOfStrokes: "Out of strokes. Restart to try again.",
    boomIn: "An explosion in {n} strokes.",
    boomNext: "The next stroke sets off an explosion.",
    boom: "Boom! A line was cut back to half.",
    blast: "Blast! A line was wiped, and the one beside it cut back to half.",
    checkMissing: "{n} pairs are not joined yet: their marbles are flashing.",
    checkMissingOne: "{n} pair is not joined yet: its marbles are flashing.",
    checkEmpty: "Every pair is joined; {n} cells are still empty.",
    checkEmptyOne: "Every pair is joined; {n} cell is still empty.",
    helpExplosionsOff: "Explosions are off: a solve counts as helped.",
    helpExplosionsSoft: "Explosions are softened: a solve counts as helped.",
    helpCheated: "Cheat has been used: a solve counts as helped.",
    zoomLabel: "Move and zoom the board",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Fit",
    up: "Up",
    down: "Down",
    left: "Left",
    right: "Right",
    difficulty: "Difficulty",
    difficultyOf: "{n} of 5",
    difficultySays: "How hard this level measured among this size's levels: its corners, the guessing it asks for, the cells you cannot fill by forced moves, and its longest line.",
    teaches: "New: {what}",
    teachesSays: "This block's new idea: its 15th level shows it gently.",
    tests: "Block's test",
    testsSays: "This block's test: its 16th level uses its twist hard.",
    bridges: "Bridges",
    bridgesSays: "A bridge is crossed by two lines: one straight across, a different one straight down. Neither may turn on it, and both must cross.",
    walls: "Walls",
    wallsSays: "No line may cross a wall, or go into a blocked cell.",
    waypoints: "Waypoints",
    waypointsSays: "A ring on a cell is a waypoint: the line of its colour must pass through it, and no other line may.",
    wrap: "Wrap",
    wrapSays: "The edges join: a line leaving one side comes back in on the other. Drag off an edge onto its faded copy, then carry on from the line's end on the far side.",
    explosions: "Explosions",
    explosionsSays: "Every few strokes, a drawn line is broken: cut back to half, or on the hardest boards wiped with a line beside it cut too. The count under the board says when the next one goes off. The same strokes always break the same line, and the stroke that solves the level sets nothing off.",
    strokes: "Stroke limit",
    strokesSays: "Only so many strokes: every time you lift your finger having changed the board, one is spent, and Undo gives none back. Run out before it is solved and Restart gives you them all again.",
    sparse: "Few lines",
    sparseSays: "Fewer pairs than a board this size usually has, so each line is long and has far to go. No new rule: the distance is the difficulty.",
    hexagon: "Hexagon",
    hexagonSays: "A honeycomb: every cell has six neighbours, so a line may run up and down, side to side, and along both slants.",
  },
  ja: {
    board: "つなぎの盤、{size}×{size}",
    boardHex: "六角形の盤、一辺{size}マス",
    marble: "玉{n}、{row}行{col}列",
    undo: "元に戻す",
    restart: "やり直す",
    check: "確かめる",
    cheat: "ヒント",
    cheatTitle: "未完成の線を一本引きます。使った解答は、助けを借りたものとして数えます。",
    hint: "玉を押して、相手の玉までなぞります。線の上を戻ると短くなり、玉をタップすると線が消えます。",
    progress: "{pairs}組中{joined}組がつながっています・盤の{percent}%",
    fullButEmpty: "すべての組がつながりました。空きマスが{n}つ残っています。",
    solved: "解けました。すべての組がつながり、すべてのマスが埋まりました。",
    strokesLeft: "残り{left}筆（全{limit}筆）。",
    outOfStrokes: "筆数がなくなりました。やり直してもう一度どうぞ。",
    boomIn: "あと{n}筆で爆発します。",
    boomNext: "次の一筆で爆発します。",
    boom: "ドカン！線が半分に切られました。",
    blast: "バーン！線が一本消え、隣の線も半分に切られました。",
    checkMissing: "まだつながっていない組が{n}つあります。その玉が光っています。",
    checkEmpty: "すべての組がつながりました。空きマスが{n}つ残っています。",
    helpExplosionsOff: "爆発なし：解いても、助けを借りたものとして数えます。",
    helpExplosionsSoft: "爆発をやわらげています：解いても、助けを借りたものとして数えます。",
    helpCheated: "ヒントを使いました：解いても、助けを借りたものとして数えます。",
    zoomLabel: "盤の移動と拡大",
    zoomIn: "拡大",
    zoomOut: "縮小",
    fit: "全体",
    up: "上へ",
    down: "下へ",
    left: "左へ",
    right: "右へ",
    difficulty: "難しさ",
    difficultyOf: "5段階中{n}",
    difficultySays: "同じ大きさのレベルの中での難しさです。角の数、当てずっぽうが必要な度合い、順に決まらないマス、いちばん長い線から測っています。",
    teaches: "新登場：{what}",
    teachesSays: "このまとまりの新しい仕掛け。15番目のレベルでやさしく出てきます。",
    tests: "まとまりの試験",
    testsSays: "このまとまりの試験。16番目のレベルで仕掛けを強く使います。",
    bridges: "橋",
    bridgesSays: "橋は二本の線が交わる場所です。一本はまっすぐ横に、別の一本はまっすぐ縦に通ります。橋の上で曲がることはできず、両方通す必要があります。",
    walls: "壁",
    wallsSays: "壁を越える線も、ふさがれたマスに入る線もできません。",
    waypoints: "中継点",
    waypointsSays: "マスの上の輪は中継点です。同じ色の線はここを必ず通り、ほかの線は通れません。",
    wrap: "巡る盤",
    wrapSays: "盤の端がつながっています。一方の端から出た線は、反対の端から入ってきます。端の外にある薄い写しへなぞり、反対側の線の端から続けてください。",
    explosions: "爆発",
    explosionsSays: "数筆ごとに、引いた線が壊れます。半分に切られるか、難しい盤では一本が消えて隣の線も切られます。次の爆発までは盤の下の数でわかります。同じ筆づかいなら同じ線が壊れ、解いた一筆では爆発しません。",
    strokes: "筆数の制限",
    strokesSays: "使える筆数が決まっています。盤を変えて指を離すたびに一筆使い、元に戻しても戻りません。解く前に使い切ったら、やり直すと全部戻ります。",
    sparse: "線が少ない盤",
    sparseSays: "この大きさにしては組が少ないので、一本一本の線が長くなります。新しいルールはなく、距離が難しさです。",
    hexagon: "六角形",
    hexagonSays: "ハチの巣の形です。どのマスにも隣が六つあり、縦、横、そして両方の斜めに線が通れます。",
  },
};

/** A line in a language, with its values filled in; the line itself if there is none by that name. */
export function tsunagiSay(language: TsunagiLanguage, key: string, values: Record<string, string | number> = {}): string {
  const table = TSUNAGI_STRINGS[language] ?? TSUNAGI_STRINGS.en;
  const one = values.n === 1 ? table[`${key}One`] : undefined;
  const line = one ?? table[key] ?? TSUNAGI_STRINGS.en[key] ?? key;
  return line.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

/** The language a piece of text is in: Japanese for anything starting `ja`, English for everything else. */
export function tsunagiLanguageOf(tag: string | null | undefined): TsunagiLanguage {
  return String(tag ?? "").toLowerCase().startsWith("ja") ? "ja" : "en";
}
