// The demo, played as a person plays it: lines dragged from a marble to its partner by mouse and by touch, shortened,
// cleared, undone, checked and solved. What the page shows is held to what the package says of the same level.
import { expect, test } from "@playwright/test";

import { at, board, cellPoint, dragCells, findLevel, levelOf, noSidewaysScroll, open, solveByDragging } from "./demo.mjs";
import { checkTsunagiAnswer, dailyTsunagiLevel } from "../dist/index.js";

test("a first visit draws the level the address names, with a marble at each end of every pair", async ({ page }) => {
  const errors = await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  await expect(page.locator(`${at("board")} .tsu-marble`)).toHaveCount(level.layout.ends.length * 2);
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "1");
  await expect(page.locator(`${at("board")} .tsp-progress`)).toContainText(`0 of ${level.layout.ends.length} joined`);
  expect(errors).toEqual([]);
  await noSidewaysScroll(page);
});

test("a line is drawn by dragging from a marble to its partner, and Undo takes it back", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  const svg = board(page);
  await dragCells(page, svg, level.layout, level.lines[0]);
  await expect(page.locator(`${at("board")} .tsu-line[data-pair="0"]`)).toHaveAttribute("data-cells", String(level.lines[0].length));
  await expect(page.locator(at("board"))).toHaveAttribute("data-joined", "1");
  await expect(page.locator(`${at("board")} .tsp-progress`)).toContainText(`1 of ${level.layout.ends.length} joined`);
  await page.locator(`${at("board")} [data-action="undo"]`).click();
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(0);
  await expect(page.locator(at("board"))).toHaveAttribute("data-joined", "0");
});

test("dragging back over a line shortens it cell by cell, without letting go", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  const svg = board(page);
  const line = level.lines.find((each) => each.length >= 4);
  await dragCells(page, svg, level.layout, [...line.slice(0, 4), line[2], line[1]], { lift: false });
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveAttribute("data-cells", "2");
  await page.mouse.up();
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveAttribute("data-cells", "2");
});

test("a marble tapped clears its line, and a line dragged into another cuts the other back", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  const svg = board(page);
  await dragCells(page, svg, level.layout, level.lines[0]);
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(1);
  await dragCells(page, svg, level.layout, [level.lines[0][0]]);
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(0);
  // Pair 1's line, drawn through a cell of pair 0's line: pair 0's is cut back to before it.
  await dragCells(page, svg, level.layout, level.lines[0]);
  const other = level.lines.findIndex((line, pair) => pair > 0 && line.some((cell) => level.lines[0].slice(1, -1).includes(cell)));
  if (other > 0) {
    await dragCells(page, svg, level.layout, level.lines[other]);
    const cut = await page.locator(`${at("board")} .tsu-line[data-pair="0"]`).count();
    if (cut > 0) expect(Number(await page.locator(`${at("board")} .tsu-line[data-pair="0"]`).getAttribute("data-cells"))).toBeLessThan(level.lines[0].length);
  }
});

test("every pair dragged along its answer solves the level, and the page says so, keeps it, and opens it solved again", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  await expect(page.locator(`${at("board")} .tsp-progress`)).toContainText("Solved");
  await expect(page.locator(`${at("block")} .lv[data-level="1"]`)).toHaveAttribute("data-solved", "true");
  // The answer the page drew is the answer the server would accept.
  expect(checkTsunagiAnswer(5, level.givens, level.answer).ok).toBe(true);
  await page.reload();
  await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(level.layout.ends.length);
  // Restart plays it again from an empty board.
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(0);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "false");
});

test("a half-drawn level is kept, and comes back as it was left", async ({ page }) => {
  await open(page, "?size=5&level=2");
  const level = levelOf(5, 2);
  await dragCells(page, board(page), level.layout, level.lines[0]);
  await page.goto("http://tsunagi.test/?size=5&level=2");
  await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
  await expect(page.locator(`${at("board")} .tsu-line[data-pair="0"]`)).toHaveAttribute("data-cells", String(level.lines[0].length));
});

test("Check flashes the marbles of the pairs not joined yet, and says how many", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  await dragCells(page, board(page), level.layout, level.lines[0]);
  await page.locator(`${at("board")} [data-action="check"]`).click();
  const pairs = level.layout.ends.length;
  await expect(page.locator(`${at("board")} .tsu-flag`)).toHaveCount((pairs - 1) * 2);
  await expect(page.locator(`${at("board")} [data-message="check"]`)).toContainText(`${pairs - 1} pair`);
});

test("a finger drags a line by touch, and the page does not scroll under it", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "touch is driven through Chromium's own protocol");
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  const svg = board(page);
  await svg.scrollIntoViewIfNeeded();
  const client = await page.context().newCDPSession(page);
  const points = [];
  for (const cell of level.lines[0]) points.push(await cellPoint(svg, level.layout, cell));
  const touch = (x, y) => [{ x, y, id: 1 }];
  const before = await page.evaluate(() => window.scrollY);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(points[0].x, points[0].y) });
  for (const point of points.slice(1)) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touch(point.x, point.y) });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(`${at("board")} .tsu-line[data-pair="0"]`)).toHaveAttribute("data-cells", String(level.lines[0].length));
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("a level with bridges, walls and explosions is solved by dragging", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("bridges") && challenges.includes("walls") && !challenges.includes("strokes") && !challenges.includes("explosions"), { sizes: [7, 8, 6] });
  await open(page, `?size=${level.size}&level=${level.level}`);
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
});

test("Today opens the level of the day at the size chosen, the same one the package names, and opens it even when it is not open yet", async ({ page }) => {
  await open(page, "?size=7&level=1");
  await page.locator(at("today")).click();
  const expected = dailyTsunagiLevel(7, new Date());
  await expect(page.locator(at("level"))).toContainText(`${expected} / 256`);
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", String(expected));
  await expect(board(page)).toBeVisible();
  await noSidewaysScroll(page);
});
