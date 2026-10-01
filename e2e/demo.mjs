// What every demo test starts from: the built demo in `site/`, served to the page without a port, a bare page
// holding only the element, the levels as the package has them, and the helpers a test draws with.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "@playwright/test";

import { challengesOf, decodeLayout, linesOfAnswer } from "../dist/index.js";
import { tsunagiGeometry } from "../dist/draw-entry.js";
import { loadEveryTsunagiLevel, tsunagiLevelsOf, TSUNAGI_SIZES } from "../dist/levels.js";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

/** Serve `site/` to a page at http://tsunagi.test/. */
export async function serve(page) {
  if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm site` first (`pnpm test:demo` does)");
  await page.route("http://tsunagi.test/**", (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
}

/** Collect anything the page complains of. */
function listen(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  return errors;
}

export const at = (id) => `[data-testid="${id}"]`;
export const board = (page) => page.locator(`${at("board")} svg.tsunagi`);

/** Open the demo with a query and wait until its board is drawn; returns what the page complains of. */
export async function open(page, query = "") {
  const errors = listen(page);
  await serve(page);
  await page.goto(`http://tsunagi.test/${query}`);
  await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
  return errors;
}

/** A page holding only what is given, with the element defined from the built package. */
export async function bare(page, html, { lang = "en" } = {}) {
  const errors = listen(page);
  await serve(page);
  await page.route("http://tsunagi.test/bare.html", (route) =>
    route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:12px;background:#2f5d4a;color:#fff;font-family:system-ui}</style></head><body>${html}<script type="module">import "./dist/element-define.js";</script></body></html>` }),
  );
  await page.goto("http://tsunagi.test/bare.html");
  await page.waitForFunction(() => customElements.get("tsunagi-board") !== undefined);
  return errors;
}

await loadEveryTsunagiLevel();

/** A level as the package has it: its code, its answer, its layout and the answer's lines. */
export function levelOf(size, level) {
  const [givens, answer] = tsunagiLevelsOf(size)[level - 1];
  const layout = decodeLayout(givens, size);
  return { size, level, givens, answer, layout, lines: linesOfAnswer(layout, answer) };
}

/** The first level, at any size, whose challenges (and code, and layout) satisfy `want`. */
export function findLevel(want, { sizes = TSUNAGI_SIZES } = {}) {
  for (const size of sizes) {
    const at = tsunagiLevelsOf(size).findIndex(([givens]) => want(challengesOf(givens), givens, decodeLayout(givens, size)));
    if (at >= 0) return levelOf(size, at + 1);
  }
  throw new Error("no such level");
}

/** Where a cell's middle is on the page, in pixels, for the board drawn in `svg`. */
export async function cellPoint(svg, layout, cell, options = {}) {
  const geometry = tsunagiGeometry(layout, options);
  const box = await svg.boundingBox();
  const middle = geometry.centre(cell);
  return { x: box.x + (middle.x / geometry.side) * box.width, y: box.y + (middle.y / geometry.side) * box.height };
}

/**
 * A finger (a mouse, where there is none) drawn through cells: down on the first, moved through each, and let go unless
 * told not to. On a board that wraps, a step across the join goes out onto the ghost of the far edge, as a finger would.
 */
export async function dragCells(page, svg, layout, cells, { lift = true } = {}) {
  await svg.scrollIntoViewIfNeeded();
  const first = await cellPoint(svg, layout, cells[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  let from = cells[0];
  for (const cell of cells.slice(1)) {
    let point = await cellPoint(svg, layout, cell);
    const across = (cell % layout.size) - (from % layout.size);
    const down = Math.floor(cell / layout.size) - Math.floor(from / layout.size);
    if (layout.wrap && (Math.abs(across) > 1 || Math.abs(down) > 1)) {
      // Out through the edge the line leaves by: the ghost of the far cell, one cell beyond it.
      const start = await cellPoint(svg, layout, from);
      const unit = Math.abs((await cellPoint(svg, layout, 1)).x - (await cellPoint(svg, layout, 0)).x);
      point = { x: start.x - (Math.abs(across) > 1 ? Math.sign(across) * unit : 0), y: start.y - (Math.abs(down) > 1 ? Math.sign(down) * unit : 0) };
    }
    // On a board that wraps one move straight to the ghost, so no cell between is passed through on the way.
    await page.mouse.move(point.x, point.y, { steps: layout.wrap ? 1 : 4 });
    from = cell;
  }
  if (lift) await page.mouse.up();
}

/** Every pair dragged along its answer, a stroke each. */
export async function solveByDragging(page, svg, level) {
  for (const line of level.lines) await dragCells(page, svg, level.layout, line);
}

/** A page does not scroll sideways. */
export async function noSidewaysScroll(page) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
}
