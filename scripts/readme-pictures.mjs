// Takes the pictures the README shows, from the built demo in `site/`: `pnpm screenshots:readme` (builds the demo, then runs this).
// The family's standard is in johnmorrisdotca/.github (README-STANDARD.md); the shared part is readme-pictures-lib.mjs.
// The page is served to a browser without a port, never fetched from the live site, and is the same each run: a level is
// opened by its address (size, level, set and look), a finished board is a level kept as solved, a half-drawn one is drawn with the
// mouse along the level's answer, and motion is reduced. It waits on the board's own svg and on the page's own `data-joined`.
// Output: docs/images/<subject>-<desk|phone>-<light|dark>.webp.
import { decodeLayout, linesOfAnswer } from "../dist/index.js";
import { tsunagiGeometry } from "../dist/draw-entry.js";
import { loadEveryTsunagiLevel, tsunagiLevelsOf, loadTsunagiLevels } from "../dist/levels.js";
import { challengesOf } from "../dist/index.js";

import { takePictures } from "./readme-pictures-lib.mjs";

await loadEveryTsunagiLevel();

/** The first level of a size, among those that have a challenge, in the first set. */
const withChallenge = (challenge, size) => {
  const at = tsunagiLevelsOf(size).findIndex(([givens]) => challengesOf(givens).includes(challenge));
  if (at < 0) throw new Error(`no ${challenge} level at ${size}×${size}`);
  return at + 1;
};

/** The demo keeps its size, level and what was solved on the device: this is the page opened on a finished board. */
const keepSolved = ({ size, level, set }) => {
  const slot = set === "portals" ? `p${size}` : String(size);
  localStorage.setItem("tsunagi.page", JSON.stringify({ size, set, levels: { [slot]: level }, solved: { [slot]: [level] } }));
};
/** The demo keeps its size and level, and nothing solved: this is the page opened on a board to draw. */
const keepOpen = ({ size, level }) => localStorage.setItem("tsunagi.page", JSON.stringify({ size, levels: { [size]: level }, solved: {} }));

/** A finished board, cropped to its drawing. */
const finished = (subject, { size, level, set = "classic", look = "" }) => ({
  subject,
  views: ["desk"],
  url: `/?lang=en&size=${size}&level=${level}&set=${set}${look}`,
  init: keepSolved,
  state: { size, level, set },
  ready: '#board[data-ready="true"] svg.tsunagi',
  target: "#board svg.tsunagi",
});

/** The level's first `pairs` pairs joined, each by dragging from one marble along the answer to the other. */
async function draw(page, size, level, pairs) {
  const [givens, answer] = (await loadTsunagiLevels(size))[level - 1];
  const layout = decodeLayout(givens, size);
  const lines = linesOfAnswer(layout, answer).slice(0, pairs);
  const geometry = tsunagiGeometry(layout);
  const svg = page.locator("#board svg.tsunagi");
  await svg.scrollIntoViewIfNeeded();
  for (const line of lines) {
    const box = await svg.boundingBox();
    const [first, ...rest] = line.map((cell) => {
      const middle = geometry.centre(cell);
      return { x: box.x + (middle.x / geometry.side) * box.width, y: box.y + (middle.y / geometry.side) * box.height };
    });
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of rest) await page.mouse.move(point.x, point.y, { steps: 2 });
    await page.mouse.up();
  }
  // Every pair drawn is on the page before it is photographed.
  await page.waitForFunction((joined) => document.getElementById("board").dataset.joined === String(joined), pairs);
}

const READY = '#board[data-ready="true"] svg.tsunagi';
await takePictures({
  shots: [
    // The page from the top, a 7×7 level with five of its seven pairs joined; and on a phone, in Japanese, a 6×6 with three of eight.
    {
      subject: "hero",
      views: ["desk", "phone"],
      height: 1180,
      url: "/?lang=en&size=7&level=1",
      init: keepOpen,
      state: { size: 7, level: 1 },
      ready: READY,
      async prepare(page, { view }) {
        if (view === "desk") {
          await draw(page, 7, 1, 5);
          await page.evaluate(() => window.scrollTo(0, 0));
        } else {
          await page.goto("http://tsunagi.test/?lang=ja&size=6&level=1");
          await page.waitForSelector(READY);
          await draw(page, 6, 1, 3);
          await page.locator("#board").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 4));
        }
      },
    },
    // Dots in colours on paper: the first look, a finished 7×7 level.
    finished("colours", { size: 7, level: 2 }),
    // Numbers and lines on wood: the pair's number on a plain shell marble, every line in a soft tint.
    finished("numbers", { size: 6, level: 3, look: "&marks=numbers&fill=lines&board=wood" }),
    // The colour-blind set on a black board, with coordinates.
    finished("colour-blind", { size: 7, level: 5, look: "&colours=colour-blind&board=black&coordinates=on" }),
    finished("walls", { size: 6, level: withChallenge("walls", 6), look: "&board=green" }),
    finished("bridges", { size: 6, level: withChallenge("bridges", 6), look: "&board=blue" }),
    finished("waypoints", { size: 6, level: withChallenge("waypoints", 6), look: "&board=paper" }),
    finished("wrap", { size: 6, level: withChallenge("wrap", 6), look: "&board=red" }),
    finished("hexagon", { size: 7, level: withChallenge("hexagon", 7), look: "&board=wood" }),
    finished("portals", { size: 7, level: 3, set: "portals", look: "&board=paper" }),
    // A 30×30 board, with its one answer drawn.
    finished("big", { size: 30, level: 1, look: "&marks=colours&fill=lines&board=paper" }),
  ],
});
