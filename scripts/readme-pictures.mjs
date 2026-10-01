// Takes the pictures the README shows, from the built demo in `site/`: `pnpm pictures` (builds the demo, then runs this).
// The page is served to a browser without a port, never fetched from the live site, and the same each run:
// the level is the demo's own first level of a size, its lines are drawn along the level's answer with the mouse,
// and motion is reduced. It waits on the board's own svg, and on the page saying every pair drawn is joined, never on a clock.
// Output: docs/desktop.jpg (1280 wide, light, English) and docs/phone.jpg (390 by 844, dark, Japanese).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { decodeLayout, linesOfAnswer } from "../dist/index.js";
import { tsunagiGeometry } from "../dist/draw-entry.js";
import { loadTsunagiLevels } from "../dist/levels.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const docs = join(root, "docs");
const host = "http://tsunagi.test";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const QUALITY = 76;

if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm pictures` (it builds the demo first)");
const browser = await chromium.launch();

/** Level 1 of a square size, with its first `pairs` pairs joined, each by dragging from one marble along the answer to the other. */
async function shot({ width, height, colorScheme, lang, size, pairs, path, scrollTo }) {
  const [givens, answer] = (await loadTsunagiLevels(size))[0];
  const lines = linesOfAnswer(decodeLayout(givens, size), answer).slice(0, pairs);
  const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: "reduce", locale: "en-US", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.route(`${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  // The demo keeps its size and level on the device: this is the board it is opened on.
  await page.addInitScript((kept) => localStorage.setItem("tsunagi.page", JSON.stringify(kept)), { size, levels: { [size]: 1 }, solved: {} });
  await page.goto(`${host}/?lang=${lang}`);
  const svg = page.locator("#board svg.tsunagi");
  await page.waitForSelector('#board[data-ready="true"] svg.tsunagi');
  // Where a cell is on the page: the drawing's own geometry, placed in the board's svg.
  const layout = decodeLayout(givens, size);
  const geometry = tsunagiGeometry(layout);
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
  if (scrollTo) await page.locator(scrollTo).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 4));
  else await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path, type: "jpeg", quality: QUALITY });
  await context.close();
}

// A 7×7 level with five of its seven pairs joined, from the top of the page so the header, the language chooser, the cloth patches
// and the board with its buttons and progress line all show.
await shot({ width: 1280, height: 1180, colorScheme: "light", lang: "en", size: 7, pairs: 5, path: join(docs, "desktop.jpg") });
// A 6×6 level with three of its eight pairs joined, on a phone in dark mode and Japanese, scrolled to the board.
await shot({ width: 390, height: 844, colorScheme: "dark", lang: "ja", size: 6, pairs: 3, path: join(docs, "phone.jpg"), scrollTo: "#board" });
await browser.close();
