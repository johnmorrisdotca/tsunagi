// 20×20, 25×25 and 30×30 played in the demo: chosen from the size row, drawn to fit the page, looked at through the zoom
// pad, and drawn on by dragging.
import { expect, test } from "@playwright/test";

import { at, board, dragCells, findLevel, levelOf, noSidewaysScroll, open, solveByDragging } from "./demo.mjs";

for (const size of [20, 25, 30]) {
  test(`${size}×${size} is in the size row, fits the page, and its first lines are drawn by dragging along the answer`, async ({ page }) => {
    await open(page, "?size=5&level=1");
    await page.locator(`${at("sizes")} button[data-value="${size}"]`).click();
    await expect(page.locator(at("level"))).toContainText("/ 64");
    await expect(board(page)).toBeVisible();
    await noSidewaysScroll(page);
    const level = levelOf(size, 1);
    await page.goto(`http://tsunagi.test/?size=${size}&level=1`);
    await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
    await noSidewaysScroll(page);
    await expect(page.locator(`${at("board")} .tsu-marble`)).toHaveCount(level.layout.ends.length * 2);
    // The first lines of the answer, drawn through every cell the finger crossed, and only those redrawn.
    for (const [pair, line] of level.lines.slice(0, 3).entries()) {
      await dragCells(page, board(page), level.layout, line);
      await expect(page.locator(`${at("board")} .tsu-line[data-pair="${pair}"]`)).toHaveAttribute("data-cells", String(line.length));
    }
    await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(3);
    await noSidewaysScroll(page);
  });
}

test("a 20×20 is solved by dragging along its answer, and the drawing kept in place is the drawing made whole", async ({ page }) => {
  // Four hundred cells dragged one mouse step at a time: quick on the machine the browser runs on, slow through a remote browser's socket.
  test.setTimeout(180_000);
  const level = levelOf(20, 1);
  await open(page, "?size=20&level=1");
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  // A line patched into the drawing and the same level drawn whole agree: every pair has its line, its washes and its beads.
  const counts = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="board"] svg.tsunagi');
    return { lines: svg.querySelectorAll(".tsu-line").length, beads: svg.querySelectorAll(".tsu-bead").length, pairs: svg.querySelectorAll(".tsu-washes > [data-pair]").length };
  });
  expect(counts.lines).toBe(level.layout.ends.length);
  expect(counts.pairs).toBe(level.layout.ends.length);
  const owned = level.layout.cells.filter((cell) => cell < 0).length;
  expect(counts.beads).toBe(owned);
});

test("a 30×30 on a phone is zoomed in through the pad, and a line is drawn at the zoom the finger can use", async ({ page }) => {
  const level = levelOf(30, 1);
  await open(page, "?size=30&level=1");
  const box = page.locator(`${at("board")} .tsp-box`);
  await expect(page.locator(`${at("board")} .tsp-pad`)).toBeVisible();
  const zoomIn = page.locator(`${at("board")} [data-action="in"]`);
  for (let each = 0; each < 3; each += 1) await zoomIn.click();
  await expect(box).toHaveAttribute("data-zoom", "3.00");
  // A line of the answer, drawn through the zoomed board: as far as the box shows, then the pad moves it on.
  const first = level.lines.find((line) => line.length >= 5);
  const pair = level.lines.indexOf(first);
  await page.locator(`${at("board")} [data-action="fit"]`).click();
  await expect(box).toHaveAttribute("data-zoom", "1.00");
  await dragCells(page, board(page), level.layout, first);
  await expect(page.locator(`${at("board")} .tsu-line[data-pair="${pair}"]`)).toHaveAttribute("data-cells", String(first.length));
});

test("every size's twist levels are drawn and drawn on: walls, wrap, portals and explosions at 20×20", async ({ page }) => {
  for (const want of ["walls", "wrap", "portals", "explosions"]) {
    const level = findLevel((challenges) => challenges.includes(want), { sizes: [20] });
    await open(page, `?size=20&level=${level.level}`);
    await expect(page.locator(`${at("board")} .tsp-chip[data-chip="${want}"]`)).toBeVisible();
    await dragCells(page, board(page), level.layout, level.lines[0]);
    await expect(page.locator(`${at("board")} .tsu-line[data-pair="0"]`)).toHaveAttribute("data-cells", String(level.lines[0].length));
  }
});
