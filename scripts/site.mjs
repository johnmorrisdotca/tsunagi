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
  `pressAt(layout, lines, cell)  // a finger down`,
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
      <div class="setup fam-row">
        <span class="fam-label" data-say="size"></span>
        <div class="fam-seg" role="group" data-say-label="size" id="sizes"></div>
      </div>
      <div class="setup fam-row">
        <span class="fam-label" data-say="level"></span>
        <button type="button" class="fam-button" id="previous" data-say-label="previous">←</button>
        <span class="fam-chip" data-lit="true"><span id="level-number">1</span><span id="level-of" class="of"></span></span>
        <button type="button" class="fam-button" id="next" data-say-label="next">→</button>
        <button type="button" class="fam-button" id="reset" data-say="reset"></button>
      </div>
      <p class="open" id="open"></p>
      <div class="table">
        <svg id="board" viewBox="0 0 100 100" role="img" aria-label="Tsunagi"></svg>
      </div>
      <p class="status" id="status" aria-live="polite"></p>
      <p class="note" id="note" aria-live="polite"></p>
      <p class="level-line" id="level" hidden></p>
      ${familyUnreviewed({ id })}
      <section class="more" aria-labelledby="more-title">
        <h2 id="more-title" data-say="moreTitle"></h2>
        <p data-say="moreText"></p>
        <ul class="uses">
          ${uses.map((line) => `<li><code>${escape(line)}</code></li>`).join("\n          ")}
        </ul>
      </section>
      ${familyFooter({ id })}
    </main>
    <script>${FAMILY_SCRIPT}</script>
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
