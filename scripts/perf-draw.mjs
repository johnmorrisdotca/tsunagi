// How long a board takes to answer a finger: `node scripts/perf-draw.mjs [size] [level] [throttle]`, after `pnpm build`.
//
// Opens the built package in Chromium on a phone's viewport (390 wide, touch), mounts one level, and draws the first lines of
// its answer by dispatching a press, a pointer move for every cell and a lift, as a finger does. For every move it records
// the time the handler took (`handler`) and the time until the next frame was painted (`frame`), with the processor slowed
// `throttle` times (default 4, about a middling phone). It prints the median and the slowest of each, in milliseconds.
/* global Element, PointerEvent, performance, requestAnimationFrame */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium, devices } from "@playwright/test";

import { loadTsunagiLevels } from "../dist/levels.js";
import { decodeLayout, linesOfAnswer } from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const size = Number(process.argv[2] ?? 30);
const level = Number(process.argv[3] ?? 1);
const throttle = Number(process.argv[4] ?? 4);
const lineCount = Number(process.env.PERF_LINES ?? 6);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

// A board of your own, as JSON with `layout` and `answer`, in `PERF_BOARD`; else the package's level.
const own = process.env.PERF_BOARD === undefined ? null : JSON.parse(readFileSync(process.env.PERF_BOARD, "utf8"));
const [givens, answer] = own === null ? (await loadTsunagiLevels(size))[level - 1] : [own.layout, own.answer];
const layout = decodeLayout(givens, size);
const lines = linesOfAnswer(layout, answer);

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
await page.route("http://tsunagi.test/**", (route) => {
  const { pathname } = new URL(route.request().url());
  if (pathname === "/bare.html") return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:12px"><div id="here"></div></body></html>' });
  try {
    return route.fulfill({ body: readFileSync(join(root, pathname)), contentType: TYPES[pathname.slice(pathname.lastIndexOf("."))] ?? "application/octet-stream" });
  } catch {
    return route.fulfill({ status: 404, body: "" });
  }
});
await page.goto("http://tsunagi.test/bare.html");
const session = await context.newCDPSession(page);
await session.send("Emulation.setCPUThrottlingRate", { rate: throttle });
const result = await page.evaluate(
  async ({ size, givens, answer, lines, lineCount }) => {
    // Events made by hand have no pointer to capture; a finger's own do, and the capture costs nothing to draw.
    Element.prototype.setPointerCapture = () => {};
    const { mountTsunagi } = await import("/dist/play-entry.js");
    const { tsunagiGeometry } = await import("/dist/draw-entry.js");
    const { decodeLayout } = await import("/dist/index.js");
    const here = document.getElementById("here");
    const mount = mountTsunagi(here, { size, givens, answer });
    const layout = decodeLayout(givens, size);
    const geometry = tsunagiGeometry(layout);
    const point = (cell) => {
      const rect = here.querySelector("svg").getBoundingClientRect();
      const middle = geometry.centre(cell);
      return { clientX: rect.left + (middle.x / geometry.side) * rect.width, clientY: rect.top + (middle.y / geometry.side) * rect.height };
    };
    const box = here.querySelector(".tsp-box");
    const fire = (type, cell) => box.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, ...point(cell) }));
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(performance.now())));
    const handler = [];
    const painted = [];
    for (const line of lines.slice(0, lineCount)) {
      fire("pointerdown", line[0]);
      if (mount.game().drawing === null) throw new Error("the press drew nothing: " + JSON.stringify(point(line[0])));
      for (const cell of line.slice(1)) {
        const start = performance.now();
        fire("pointermove", cell);
        handler.push(performance.now() - start);
        painted.push((await frame()) - start);
      }
      fire("pointerup", line[line.length - 1]);
    }
    return { moves: handler.length, handler, painted, drawn: mount.progress().filled, cells: mount.progress().cells, svgNodes: here.querySelectorAll("svg *").length };
  },
  { size, givens, answer, lines, lineCount },
);
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
const worst = (list) => Math.max(...list);
console.log(`${size}×${size}, level ${level}, processor slowed ${throttle}×, ${result.moves} moves over ${lineCount} lines, ${result.drawn} of ${result.cells} cells drawn, ${result.svgNodes} svg nodes`);
console.log(`handler: median ${median(result.handler).toFixed(1)} ms, slowest ${worst(result.handler).toFixed(1)} ms`);
console.log(`frame:   median ${median(result.painted).toFixed(1)} ms, slowest ${worst(result.painted).toFixed(1)} ms`);
await browser.close();
