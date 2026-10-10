import { expect, test } from "@playwright/test";
import { decodeLayout, linesOfAnswer } from "../dist/index.js";
import { loadTsunagiLevels } from "../dist/levels.js";
import { serve } from "./demo.mjs";

const moves = (layout) => [["ArrowUp", -1, 0], ["ArrowRight", 0, 1], ["ArrowDown", 1, 0], ["ArrowLeft", 0, -1], ...(layout.hex ? [["q", 1, -1], ["e", -1, 1]] : [])];
function neighbours(layout, cell) {
  return moves(layout).flatMap(([key, dr, dc]) => {
    let row = Math.floor(cell / layout.size) + dr; let col = cell % layout.size + dc;
    if (layout.wrap) { row = (row + layout.size) % layout.size; col = (col + layout.size) % layout.size; }
    const next = row * layout.size + col;
    return row >= 0 && col >= 0 && row < layout.size && col < layout.size && layout.cells[next] !== -2 ? [[key, next]] : [];
  });
}
function route(layout, from, to) {
  const queue = [[from, []]]; const seen = new Set([from]);
  for (let at = 0; at < queue.length; at++) {
    const [cell, path] = queue[at]; if (cell === to) return path;
    for (const [key, next] of neighbours(layout, cell)) if (!seen.has(next)) { seen.add(next); queue.push([next, [...path, key]]); }
  }
  throw new Error(`No keyboard route from ${from} to ${to}`);
}
async function solveWithKeys(board, layout, answer) {
  const box = board.locator(".tsp-box"); const lines = linesOfAnswer(layout, answer);
  for (const [pair, line] of lines.entries()) {
    const cursor = Number(await box.getAttribute("data-keyboard-cell"));
    for (const key of route(layout, cursor, line[0])) await box.press(key);
    await box.press("Enter");
    for (let guard = 0; guard < layout.cells.length * 2; guard++) {
      const state = await board.evaluate((element, pair) => ({ count: element.game.lines[pair].length, cursor: Number(element.querySelector(".tsp-box").dataset.keyboardCell) }), pair);
      if (state.count === line.length) break;
      const target = line[state.count]; const key = neighbours(layout, state.cursor).find(([, next]) => next === target)?.[0];
      expect(key, `the next answer cell ${target} neighbours cursor ${state.cursor}`).toBeDefined();
      await box.press(key);
    }
    await box.press("Enter");
  }
  await expect.poll(() => board.evaluate((element) => element.game.solved)).toBe(true);
}

test("the shared builder covers options and writes host formats", async ({ page }) => {
  const errors = []; page.on("pageerror", (error) => errors.push(String(error)));
  await serve(page); await page.goto("http://tsunagi.test/builder.html?lang=en"); await expect(page.locator("#bld-stage tsunagi-board svg")).toBeVisible();
  for (const format of ["element", "iframe", "module", "react", "vue", "svelte", "angular", "html", "url"]) { await page.locator(`#bld-formats [data-format="${format}"]`).click(); await expect(page.locator("#bld-code")).not.toHaveText(""); }
  await page.locator('[data-lang="ja"]').click(); await expect(page.locator("#bld-maker-says")).toContainText("玉"); expect(errors).toEqual([]);
});

for (const set of ["classic", "portals"]) test(`the ${set} UTC daily level repeats and numeric sizes still work`, async ({ page }) => {
  await serve(page); await page.goto(`http://tsunagi.test/embed/?set=${set}&grid=5&daily=2026-10-09&size=small`); const board = page.locator("tsunagi-board"); await expect(board.locator("svg")).toBeVisible();
  const givens = await board.evaluate((element) => element.game.givens); await expect(board).toHaveAttribute("data-day", "2026-10-09"); await page.reload(); await expect(board.locator("svg")).toBeVisible(); expect(await board.evaluate((element) => element.game.givens)).toBe(givens);
  await page.goto("http://tsunagi.test/embed/?size=5&level=1"); await expect(board.locator("svg")).toBeVisible(); expect(await board.evaluate((element) => element.game.layout.size)).toBe(5);
});

for (const variant of ["classic", "portals", "hexagon"]) test(`a ${variant} level can be solved entirely from the keyboard`, async ({ page }) => {
  const set = variant === "portals" ? "portals" : "classic"; const size = variant === "hexagon" ? 7 : 5;
  const rows = await loadTsunagiLevels(size, set); const at = variant === "hexagon" ? rows.findIndex(([givens]) => decodeLayout(givens, size).hex) : 0;
  const [givens, answer] = rows[at]; const layout = decodeLayout(givens, size);
  await serve(page); await page.goto(`http://tsunagi.test/embed/?grid=${size}&set=${set}&level=${at + 1}&explosions=off`);
  const board = page.locator("tsunagi-board"); await expect(board.locator("svg")).toBeVisible(); await solveWithKeys(board, layout, answer);
});

test("reflected properties keep live progress, methods and host callbacks", async ({ page }) => {
  await serve(page); await page.goto("http://tsunagi.test/embed/?grid=5&level=1&controls=false&explosions=no&zoom=0&theme=dark"); const board = page.locator("tsunagi-board"); await expect(board.locator("svg")).toBeVisible();
  expect(await board.locator("svg").evaluate((svg) => getComputedStyle(svg).getPropertyValue("--tsu-paper").trim())).toBe("#262a27");
  const result = await board.evaluate(async (element) => {
    const { encodeLines } = await import("../dist/index.js"); const kept = encodeLines(element.game.layout, element.game.lines);
    element.progress = kept; await new Promise((resolve) => window.setTimeout(resolve, 0));
    const game = element.game; element.options = { onChange: () => { window.heard = true; } }; await new Promise((resolve) => window.setTimeout(resolve, 0));
    return { progress: typeof element.progress.joined, same: element.game === game, undo: typeof element.undo, cheat: typeof element.cheat, explosions: element.game.explosions };
  });
  expect(result).toEqual({ progress: "number", same: true, undo: "function", cheat: "function", explosions: "off" });
  await board.locator(".tsp-box").press("Enter"); expect(await page.evaluate(() => window.heard)).toBe(true);
});

test("keyboard changes forward JSON-safe native detail and copied frames fit a narrow article", async ({ page }) => {
  await serve(page); await page.route("http://host.test/", (route) => route.fulfill({ contentType: "text/html", body: '<script>window.messages=[];addEventListener("message",event=>{if(event.origin==="http://tsunagi.test")messages.push(event.data);});</script><iframe src="http://tsunagi.test/embed/?grid=5&level=1" width="360" height="900"></iframe>' }));
  await page.goto("http://host.test/"); const board = page.frameLocator("iframe").locator("tsunagi-board"); await expect(board.locator("svg")).toBeVisible(); await board.locator(".tsp-box").press("Enter");
  await expect.poll(() => page.evaluate(() => window.messages.some((message) => message.type === "tsunagi-change"))).toBe(true); const message = await page.evaluate(() => window.messages.find((made) => made.type === "tsunagi-change")); expect(JSON.parse(JSON.stringify(message))).toEqual(message);
  await page.goto("http://tsunagi.test/builder.html?lang=en"); await expect(page.locator("#bld-stage tsunagi-board svg")).toBeVisible(); await page.locator('#bld-formats [data-format="iframe"]').click(); const code = (await page.locator("#bld-code").textContent()).replaceAll("https://johnmorrisdotca.github.io/tsunagi/", "http://tsunagi.test/").replace('loading="lazy"', '');
  await page.route("http://article.test/", (route) => route.fulfill({ contentType: "text/html", body: `<style>body{margin:0;width:320px}</style>${code}` })); await page.goto("http://article.test/"); await expect(page.frameLocator("iframe").locator("tsunagi-board svg")).toBeVisible(); const child = page.frames().find((frame) => frame.url().startsWith("http://tsunagi.test/embed/")); expect(await child.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight && document.documentElement.scrollWidth <= window.innerWidth && window.localStorage.length === 0)).toBe(true);
});
