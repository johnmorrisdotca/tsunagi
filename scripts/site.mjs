// Builds the static demo for GitHub Pages into ./site: the page, written here from the family's
// shared header and footer, with the family's stylesheet, Tsunagi's own, the page's script and the
// compiled library beside it.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

import { API_CSS, apiPage } from "./api.mjs";
import { FAMILY_SCRIPT, familyFooter, familyHead, familyHeader, familyUnreviewed } from "./family-template.mjs";

const id = "tsunagi";
const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%232f5d4a'/%3E%3Ctext x='50' y='70' font-size='60' text-anchor='middle' fill='%23f3efe4'%3E繋%3C/text%3E%3C/svg%3E";

const uses = [
  `import { TSUNAGI_7 } from "@johnmorrisdotca/tsunagi/levels-7";`,
  `checkTsunagiAnswer(7, layout, answer)  // { ok: true }`,
  `countSolutions(decodeLayout(layout, 7), 2).count  // 1`,
  `drawTsunagi(layout, { lines, marks: "numbers", fill: "lines" })  // the board as SVG text`,
  `mountTsunagi(element, { size: 7, givens, answer, board: "wood" })  // a board to play, by touch and mouse`,
  `<tsunagi-board size="7" level="12" colour-set="colour-blind"></tsunagi-board>`,
  `pressGame(game, cell)  // a finger down, as pure functions`,
  `openTsunagiLevels(7, solved)  // 16, 32, …`,
];
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const page = `<!doctype html>
<html lang="en">
  <head>
    ${familyHead({
      id,
      title: "Tsunagi · join the marbles, fill the board",
      description: "Play Tsunagi, the line-joining logic puzzle: 1,792 levels from 4×4 to 12×12, each with exactly one answer, with walls, bridges, waypoints and hexagon boards. Free and open source, in English and Japanese.",
      ogTitle: "Tsunagi line puzzle",
      ogDescription: "Join each pair of marbles with a line, and fill the board. 1,792 levels, each with one answer.",
    })}
    <link rel="icon" href="${ICON}" />
    <link rel="stylesheet" href="family.css" />
    <link rel="stylesheet" href="tsunagi.css" />
  </head>
  <body>
    <main>
      ${familyHeader({ id, links: [{ href: "api.html", say: "pageApi" }] })}
      <div class="setup fam-row" data-help-en="Choose the board size. Each size has its own levels." data-help-ja="盤の大きさを選びます。大きさごとにレベルがあります。">
        <span class="fam-label" data-say="size"></span>
        <div class="fam-seg" role="group" data-say-label="size" id="sizes" data-testid="sizes"></div>
      </div>
      <div class="setup fam-row" data-help-en="Step to the next or the previous level. Every level has exactly one answer." data-help-ja="矢印で前後のレベルに移ります。どのレベルも、答えはひとつだけです。">
        <span class="fam-label" data-say="level"></span>
        <button type="button" class="fam-button" id="previous" data-testid="previous" data-say-label="previous">←</button>
        <span class="fam-chip" data-lit="true" data-testid="level"><span id="level-number">1</span><span id="level-of" class="of"></span></span>
        <button type="button" class="fam-button" id="next" data-testid="next" data-say-label="next">→</button>
      </div>
      <p class="open" id="open"></p>
      <div class="table fam-felt" id="board" data-testid="board"></div>
      <section class="settings" aria-labelledby="look-title">
        <h2 id="look-title" data-say="look"></h2>
        <div class="setup fam-row" data-help-en="Show the pairs of marbles by colour or by number. You join the two that match." data-help-ja="ビー玉の組を、色か数字で見分けます。同じ組の2つをつなぎます。"><span class="fam-label" data-say="marks"></span><div class="fam-seg" role="group" data-say-label="marks" id="marks" data-testid="marks"></div></div>
        <div class="setup fam-row" data-help-en="Draw dots along each line as well, or the lines alone." data-help-ja="線に沿って点も描くか、線だけにするかを選びます。"><span class="fam-label" data-say="fill"></span><div class="fam-seg" role="group" data-say-label="fill" id="fill" data-testid="fill"></div></div>
        <div class="setup fam-row" data-help-en="Choose the colours of the marbles. Colour-blind uses colours that are easier to tell apart." data-help-ja="ビー玉の色の組を選びます。「色覚にやさしい」は見分けやすい色です。"><span class="fam-label" data-say="colourSet"></span><div class="fam-seg" role="group" data-say-label="colourSet" id="colour-set" data-testid="colour-set"></div></div>
        <div class="setup fam-row" data-help-en="Choose the look of the board: paper, wood, or a colour." data-help-ja="盤の見た目（紙、木目、色）を選びます。"><span class="fam-label" data-say="board"></span><div class="fam-seg" role="group" data-say-label="board" id="board-look" data-testid="board-look"></div></div>
        <div class="setup fam-row" data-help-en="Show or hide the letters and numbers that name the cells." data-help-ja="セルを示す文字と数字を、表示するか隠します。"><span class="fam-label" data-say="coordinates"></span><div class="fam-seg" role="group" data-say-label="coordinates" id="coordinates" data-testid="coordinates"></div></div>
        <h2 data-say="play"></h2>
        <div class="setup fam-row" data-help-en="What a mistake does: a full explosion, a softer one, or none. Softer or off counts as helped." data-help-ja="間違えたときの爆発の強さです（ふつう・弱め・なし）。弱めかなしで解くと「助けあり」になります。"><span class="fam-label" data-say="explosions"></span><div class="fam-seg" role="group" data-say-label="explosions" id="explosions" data-testid="explosions"></div></div>
        <div class="setup fam-row" data-help-en="Allow the Cheat button, which shows part of the answer. A level solved with it counts as helped." data-help-ja="答えの一部を見せる「ヒント」ボタンを使えるようにします。使って解くと「助けあり」になります。"><span class="fam-label" data-say="cheating"></span><div class="fam-seg" role="group" data-say-label="cheating" id="cheats" data-testid="cheats"></div></div>
        <p class="fam-fine" data-say="helpCosts"></p>
      </section>
      <section class="more blocks" aria-labelledby="block-title">
        <h2 id="block-title"></h2>
        <p data-say="blockText"></p>
        <div class="block" id="block" data-testid="block"></div>
      </section>
      ${familyUnreviewed({ id })}
      <section class="more" aria-labelledby="more-title">
        <h2 id="more-title" data-say="moreTitle"></h2>
        <p data-say="moreText"></p>
        <ul class="uses">
          ${uses.map((line) => `<li><code>${escape(line)}</code></li>`).join("\n          ")}
        </ul>
      </section>
      <section class="more tag" aria-labelledby="tag-title">
        <h2 id="tag-title" data-say="tagTitle"></h2>
        <p data-say="tagText"></p>
        <tsunagi-board id="tag" data-testid="tag" size="5" level="2" marks="numbers" fill="lines" chips></tsunagi-board>
      </section>
      ${familyFooter({ id })}
    </main>
    <script>${FAMILY_SCRIPT}</script>
    <script type="module" src="dist/element-define.js"></script>
    <script type="module" src="demo.js"></script>
  </body>
</html>
`;

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
cpSync("dist", "site/dist", { recursive: true });
writeFileSync("site/index.html", page);
// The API reference, made from the source: every export of every entry point.
writeFileSync("site/api.css", API_CSS);
writeFileSync("site/api.html", apiPage({ id, name: "Tsunagi", icon: ICON }));
console.log("site/ is ready: serve it, or let the Pages workflow publish it.");
