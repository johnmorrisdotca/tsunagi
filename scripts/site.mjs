// Builds the static demo for GitHub Pages into ./site: the page, written here from the family's
// shared header and footer, with the family's stylesheet, Tsunagi's own, the page's script and the
// compiled library beside it.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { build } from "esbuild";

import { API_CSS, apiPage } from "./api.mjs";
import {
  FAMILY_EMBED_BUILDER_WORDS,
  FAMILY_SCRIPT,
  familyEmbedBuilder,
  familyFooter,
  familyHead,
  familyHeader,
  familyUnreviewed,
} from "./family-template.mjs";
import { publishThumbnails, thumbnailHead } from "./family-thumbnail.mjs";

const id = "tsunagi";
const ALT =
  "Tsunagi: three finished boards, every pair of marbles joined by a line, a square grid on paper, a hexagon on wood and bridges on blue.";
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%232f5d4a'/%3E%3Ctext x='50' y='70' font-size='60' text-anchor='middle' fill='%23f3efe4'%3E繋%3C/text%3E%3C/svg%3E";

const uses = [
  `import { TSUNAGI_7 } from "@johnmorrisdotca/tsunagi/levels-7";`,
  `checkTsunagiAnswer(7, layout, answer)  // { ok: true }`,
  `countSolutions(decodeLayout(layout, 7), 2).count  // 1`,
  `drawTsunagi(layout, { lines, marks: "numbers", fill: "lines" })  // the board as SVG text`,
  `mountTsunagi(element, { size: 7, givens, answer, board: "wood" })  // a board to play, by touch and mouse`,
  `<tsunagi-board size="7" level="12" colour-set="colour-blind"></tsunagi-board>`,
  `pressGame(game, cell)  // a finger down, as pure functions`,
  `openTsunagiLevels(7, solved)  // 16, 32, …`,
  `loadTsunagiLevels(7, "portals")  // the levels with portals, where a line goes into one ring and out of another`,
  `dailyTsunagiLevel(7, new Date())  // the level of the day at 7×7, the same for everybody`,
];
const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The page is demo/index.html; each <!-- family:key --> in it is replaced by the text below.
const pageParts = {
  head: familyHead({
    id,
    title: "Tsunagi 繋ぎ — Connect-the-pairs line puzzle",
    description:
      "Play Tsunagi, the line-joining logic puzzle: 2,368 levels from 4×4 to 30×30 and 256 more with portals, each with exactly one answer, with walls, bridges, waypoints, wrap and hexagon boards. Free and open source, in English and Japanese.",
    ogTitle: "Tsunagi 繋ぎ — Connect-the-pairs line puzzle",
    ogDescription:
      "Join each pair of marbles with a line, and fill the board. 2,368 levels and 256 with portals, each with one answer.",
  }),
  thumbnail: thumbnailHead(JSON.parse(readFileSync("package.json", "utf8")), { alt: ALT }),
  icon: ICON,

  header: familyHeader({
    id,
    links: [
      { href: "docs/index.html", say: "pageDocs" },
      { href: "api.html", say: "pageApi" },
    ],
  }),
  unreviewed: familyUnreviewed({ id }),
  uses: uses.map((line) => `<li><code>${escapeHtml(line)}</code></li>`).join("\n          "),
  footer: familyFooter({ id }),
  script: `<script>${FAMILY_SCRIPT}</script>\n    <script type="module" src="kazoku-parts.js"></script>\n    <script type="module" src="embed-panel.js"></script>`,
};
const page = readFileSync("demo/index.html", "utf8").replace(
  /<!-- family:([A-Za-z]+) -->/g,
  (_match, key) => pageParts[key],
);

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
cpSync("dist", "site/dist", { recursive: true });
writeFileSync("site/index.html", page);
// The family's card, dark card and icon, at <site>/thumbnail.png, thumbnail-dark.png and icon.png.
publishThumbnails(".", "site");
// The family header's language picker and theme switch, as one small module for every page of the site (the demo, the builder, the API reference and the docs).
await build({
  stdin: {
    contents:
      'import "@johnmorrisdotca/kazoku-ui/language-picker/define";\nimport "@johnmorrisdotca/kazoku-ui/theme-switch/define";\n',
    resolveDir: process.cwd(),
  },
  outfile: "site/kazoku-parts.js",
  bundle: true,
  format: "esm",
  minify: true,
  logLevel: "silent",
});
// The demo's "Put it in your page": kazoku-ui's embed panel, filled with this package's choices and code.
await build({
  entryPoints: ["demo/embed-panel.js"],
  outfile: "site/embed-panel.js",
  external: ["./dist/*"],
  bundle: true,
  format: "esm",
  minify: true,
  logLevel: "silent",
});
// The API reference, made from the source: every export of every entry point.
writeFileSync("site/api.css", API_CSS);
writeFileSync("site/api.html", apiPage({ id, name: "Tsunagi", icon: ICON }));
console.log("site/ is ready: serve it, or let the Pages workflow publish it.");

for (const file of ["builder.js", "builder.css"]) cpSync(`demo/${file}`, `site/${file}`);
cpSync("demo/embed", "site/embed", { recursive: true });
writeFileSync(
  "site/family-embed-builder.js",
  `export const FAMILY_EMBED_BUILDER_WORDS = ${JSON.stringify(FAMILY_EMBED_BUILDER_WORDS)};\nexport ${familyEmbedBuilder.toString()};\n`,
);
const builderParts = {
  builderHead: familyHead({
    id,
    title: "Tsunagi · build a line-puzzle embed",
    description: "Choose a fixed or daily line puzzle, preview it and copy the embed code.",
  }),
  builderHeader: familyHeader({
    id,
    links: [
      { href: "./", say: "toGallery" },
      { href: "docs/index.html", say: "pageDocs" },
      { href: "api.html", say: "pageApi" },
    ],
  }),
  unreviewed: familyUnreviewed({ id }),
  footer: familyFooter({ id }),
  script: `<script>${FAMILY_SCRIPT}</script>\n    <script type="module" src="kazoku-parts.js"></script>`,
};
writeFileSync(
  "site/builder.html",
  readFileSync("demo/builder.html", "utf8").replace(/<!-- family:([A-Za-z]+) -->/g, (_match, key) => builderParts[key]),
);
