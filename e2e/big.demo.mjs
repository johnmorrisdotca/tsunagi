// 13×13, 14×14 and 15×15 played in the demo: chosen from the size row, drawn to fit the page, solved by dragging along the answer, and zoomed through the pad.
import { expect, test } from "@playwright/test";

import { at, board, dragCells, findLevel, noSidewaysScroll, open, solveByDragging } from "./demo.mjs";

const levelUrl = (level) => `?size=${level.size}&level=${level.level}`;

for (const size of [13, 14, 15]) {
  test(`${size}×${size} is in the size row, fits the page, and a level is solved by dragging along its answer`, async ({ page }) => {
    await open(page, "?size=5&level=1");
    await page.locator(`${at("sizes")} button[data-value="${size}"]`).click();
    await expect(page.locator(at("level"))).toContainText("/ 128");
    await expect(board(page)).toBeVisible();
    await noSidewaysScroll(page);
    const level = findLevel((challenges) => challenges.length === 0, { sizes: [size] });
    await page.goto(`http://tsunagi.test/${levelUrl(level)}`);
    await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
    await noSidewaysScroll(page);
    const box = page.locator(`${at("board")} .tsp-box`);
    const onPage = async () => ({ ...(await box.boundingBox()), y: (await box.boundingBox()).y + (await page.evaluate(() => window.scrollY)) });
    const first = await onPage();
    expect(first.width).toBeGreaterThan(200);
    await solveByDragging(page, board(page), level);
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    expect(await onPage()).toEqual(first);
    await noSidewaysScroll(page);
  });
}

test("a 15×15 is looked at through the pad: zoomed in and out, the first line is drawn through every cell the finger crossed", async ({ page }) => {
  const level = findLevel((challenges) => challenges.length === 0, { sizes: [15] });
  await open(page, levelUrl(level));
  const box = page.locator(`${at("board")} .tsp-box`);
  await expect(page.locator(`${at("board")} .tsp-pad`)).toBeVisible();
  await expect(box).toHaveAttribute("data-zoom", "1.00");
  const zoomIn = page.locator(`${at("board")} [data-action="in"]`);
  await zoomIn.click();
  await zoomIn.click();
  await expect(box).not.toHaveAttribute("data-zoom", "1.00");
  await page.locator(`${at("board")} [data-action="fit"]`).click();
  await expect(box).toHaveAttribute("data-zoom", "1.00");
  // The first line, drawn at Fit, is the answer's own cells.
  const line = level.lines[0];
  await dragCells(page, board(page), level.layout, line);
  await expect(page.locator(`${at("board")} svg.tsunagi .tsu-line[data-pair="0"]`)).toHaveAttribute("data-cells", String(line.length));
});

test("a 13×13 hexagon and a 15×15 with bridges are solved by dragging", async ({ page }) => {
  for (const [size, want] of [
    [13, "hexagon"],
    [15, "bridges"],
  ]) {
    const level = findLevel((challenges) => challenges.includes(want), { sizes: [size] });
    await open(page, levelUrl(level));
    await solveByDragging(page, board(page), level);
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  }
});
