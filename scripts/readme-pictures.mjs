// Takes the pictures the README shows, from the built demo in `site/`: `pnpm pictures` (builds the demo, then runs this).
// The page is served to a browser without a port, never fetched from the live site, and the same each run:
// the level is the demo's own first level of a size, its lines are drawn along the level's answer with the mouse,
// and motion is reduced.
// Output: docs/desktop.jpg (1280 wide, light, English) and docs/phone.jpg (390 by 844, dark, Japanese).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { decodeLayout, linesOfAnswer } from "../dist/index.js";
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
  await page.locator("#board rect").first().waitFor();
  const box = await page.locator("#board").boundingBox();
  const at = (cell) => ({ x: box.x + (((cell % size) + 0.5) / size) * box.width, y: box.y + ((Math.floor(cell / size) + 0.5) / size) * box.height });
  for (const line of lines) {
    const [first, ...rest] = line.map(at);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of rest) await page.mouse.move(point.x, point.y, { steps: 2 });
    await page.mouse.up();
  }
  await page.waitForTimeout(300);
  if (scrollTo) await page.locator(scrollTo).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 16));
  else await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path, type: "jpeg", quality: QUALITY });
  await context.close();
}

// A 7×7 level solved, from the top of the page so the header, the language chooser and the cloth patches show.
await shot({ width: 1280, height: 1000, colorScheme: "light", lang: "en", size: 7, pairs: 7, path: join(docs, "desktop.jpg") });
// A 6×6 level half drawn, on a phone in Japanese, scrolled to the board.
await shot({ width: 390, height: 844, colorScheme: "dark", lang: "ja", size: 6, pairs: 3, path: join(docs, "phone.jpg"), scrollTo: ".table" });
await browser.close();
