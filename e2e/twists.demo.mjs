// The twists a level can have, as the demo draws and plays them: a hexagon, a wrap, explosions, a stroke limit, Cheat,
// and a big board looked at through its zoom pad. At a phone's width and a desk's, nothing scrolls sideways.
import { expect, test } from "@playwright/test";

import { at, board, cellPoint, dragCells, findLevel, noSidewaysScroll, open, solveByDragging } from "./demo.mjs";
import { inHex } from "../dist/index.js";

const levelUrl = (level, more = "") => `?size=${level.size}&level=${level.level}${more}`;

test("a hexagon is a honeycomb of outlined cells, and is solved by dragging along the slants", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("hexagon"));
  await open(page, levelUrl(level));
  const cells = Array.from({ length: level.size * level.size }, (_, at) => at).filter((cell) => inHex(level.size, cell)).length;
  await expect(page.locator(`${at("board")} .tsu-hex-cell`)).toHaveCount(cells);
  await expect(board(page)).toHaveAttribute("data-hex", "true");
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  await noSidewaysScroll(page);
});

test("the square's corners off a hexagon are not pressed", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("hexagon"));
  await open(page, levelUrl(level));
  const svg = board(page);
  const corner = Array.from({ length: level.size * level.size }, (_, at) => at).find((cell) => !inHex(level.size, cell));
  const point = await cellPoint(svg, level.layout, corner);
  await svg.scrollIntoViewIfNeeded();
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(0);
});

test("a board that wraps shows the far edge faded all round it, and a line is drawn off one side and on at the other", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("wrap"));
  await open(page, levelUrl(level));
  await expect(page.locator(`${at("board")} .tsu-ghosts`)).toHaveCount(1);
  await expect(page.locator(`${at("board")} .tsu-rim`)).toHaveCount(1);
  const across = level.lines.some((line) => line.some((cell, at) => at > 0 && Math.abs(cell - line[at - 1]) !== 1 && Math.abs(cell - line[at - 1]) !== level.size));
  expect(across).toBe(true);
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  // A line across the join is drawn in two runs, one into the ghost and one out of it.
  const runs = await page.locator(`${at("board")} .tsu-line polyline`).count();
  expect(runs).toBeGreaterThan(level.layout.ends.length);
});

test("walls stop a line, and a blocked cell is a dark square", async ({ page }) => {
  const level = findLevel((challenges, givens) => challenges.includes("walls") && /\d-\d/.test(givens), { sizes: [6, 7, 8, 5] });
  await open(page, levelUrl(level));
  await expect(page.locator(`${at("board")} .tsu-wall`)).toHaveCount(level.layout.walls.size);
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
});

test("a waypoint is a ring only its own line may pass, and the level is solved through it", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("waypoints") && !challenges.includes("explosions"));
  await open(page, levelUrl(level));
  await expect(page.locator(`${at("board")} .tsu-waypoint`)).toHaveCount(level.layout.waypoints.size);
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
});

test("explosions count down, break a line the rule chose, burst where it was, and leave nothing to undo", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("explosions") && !challenges.includes("strokes") && !challenges.includes("bridges"));
  await open(page, levelUrl(level));
  const every = level.layout.explosions.every;
  await expect(page.locator(`${at("board")} [data-message="boom"]`)).toContainText(`${every} strokes`);
  const [a, b, c] = level.lines[0];
  const svg = board(page);
  for (let stroke = 1; stroke <= every; stroke += 1) {
    await expect(page.locator(`${at("board")} [data-message="boom"]`)).toContainText(stroke === every ? "The next stroke" : `${every - stroke + 1} strokes`);
    await dragCells(page, svg, level.layout, stroke % 2 === 1 ? [a, b, c] : [b]);
  }
  await expect(page.locator(`${at("board")} [data-message="boom"]`)).toContainText(/Boom!|Blast!/);
  await expect(page.locator(`${at("board")} .tsu-blast`).first()).toBeVisible();
  // Nothing to undo after an explosion: it is not taken back.
  await expect(page.locator(`${at("board")} [data-action="undo"]`)).toBeDisabled();
  // The count starts again.
  await expect(page.locator(`${at("board")} [data-message="boom"]`)).toContainText(`${every} strokes`);
});

test("softer or off explosions are chosen on the page, and a solve with them counts as helped without opening the next block", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("explosions") && !challenges.includes("strokes") && !challenges.includes("bridges"));
  await open(page, levelUrl(level, "&explosions=off"));
  await expect(page.locator(`${at("board")} [data-message="boom"]`)).toHaveCount(0);
  await expect(page.locator(`${at("board")} [data-message="help"]`)).toContainText("Explosions are off");
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("tsunagi.page")));
  expect(kept.helped[level.size]).toContain(level.level);
  expect(kept.solved?.[level.size] ?? []).not.toContain(level.level);
  await page.locator(`${at("explosions")} button[data-value="soft"]`).click();
  await expect(page.locator(`${at("board")} [data-message="help"]`)).toContainText("softened");
});

test("a stroke limit counts every lift down, and a board out of strokes takes nothing until Restart", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("strokes") && !challenges.includes("bridges") && !challenges.includes("explosions"));
  await open(page, levelUrl(level));
  const limit = level.layout.strokes;
  const message = page.locator(`${at("board")} [data-message="strokes"]`);
  await expect(message).toContainText(`${limit} of ${limit}`);
  const svg = board(page);
  const [a, b, c] = level.lines[0];
  for (let stroke = 1; stroke <= limit; stroke += 1) await dragCells(page, svg, level.layout, stroke % 2 === 1 ? [a, b, c] : [b]);
  await expect(message).toContainText("Out of strokes");
  await dragCells(page, svg, level.layout, level.lines[1]);
  await expect(page.locator(`${at("board")} .tsu-line[data-pair="1"]`)).toHaveCount(0);
  await expect(page.locator(`${at("board")} [data-action="undo"]`)).toBeDisabled();
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await expect(message).toContainText(`${limit} of ${limit}`);
  await solveByDragging(page, svg, level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
});

test("Cheat is offered only when allowed, draws one line at a time, and the solve is helped", async ({ page }) => {
  const level = findLevel((challenges) => challenges.length === 0 && true, { sizes: [5] });
  await open(page, levelUrl(level));
  await expect(page.locator(`${at("board")} [data-action="cheat"]`)).toBeHidden();
  await page.locator(`${at("cheats")} button[data-value="true"]`).click();
  const cheat = page.locator(`${at("board")} [data-action="cheat"]`);
  await expect(cheat).toBeVisible();
  await cheat.click();
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(1);
  await expect(page.locator(`${at("board")} [data-message="help"]`)).toContainText("Cheat");
  for (let at0 = 1; at0 < level.layout.ends.length; at0 += 1) await cheat.click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("tsunagi.page")));
  expect(kept.helped[level.size]).toContain(level.level);
});

test("a big board is looked at through a box: the pad zooms and moves it, Fit shows it whole, and a line drawn zoomed lands where the finger is", async ({ page }) => {
  const level = findLevel((challenges) => challenges.length === 0, { sizes: [10] });
  await open(page, levelUrl(level));
  const box = page.locator(`${at("board")} .tsp-box`);
  await expect(page.locator(`${at("board")} .tsp-pad`)).toBeVisible();
  await expect(box).toHaveAttribute("data-zoom", "1.00");
  await expect(page.locator(`${at("board")} [data-action="fit"]`)).toBeDisabled();
  await page.locator(`${at("board")} [data-action="in"]`).click();
  await page.locator(`${at("board")} [data-action="in"]`).click();
  await expect(box).not.toHaveAttribute("data-zoom", "1.00");
  await expect(page.locator(`${at("board")} [data-action="fit"]`)).toBeEnabled();
  const before = await box.boundingBox();
  await page.locator(`${at("board")} [data-action="right"]`).click();
  expect(await box.boundingBox()).toEqual(before);
  await page.locator(`${at("board")} [data-action="fit"]`).click();
  await expect(box).toHaveAttribute("data-zoom", "1.00");
  // Smaller boards are given no pad.
  await page.goto("http://tsunagi.test/?size=6&level=1");
  await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
  await expect(page.locator(`${at("board")} .tsp-pad`)).toBeHidden();
});

test("at 12×12 a level is solved by dragging at Fit, and the wheel zooms the board while the page stays where it is", async ({ page }) => {
  const level = findLevel((challenges) => challenges.length === 0, { sizes: [12] });
  await open(page, levelUrl(level));
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  await page.goto("http://tsunagi.test/?size=12&level=1");
  await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
  const box = page.locator(`${at("board")} .tsp-box`);
  // The mouse needs the board on the screen, which the demo's own controls above it (a row more since portals) may push past a phone's foot.
  await box.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  const rect = await box.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.wheel(0, -400);
  await expect(box).not.toHaveAttribute("data-zoom", "1.00");
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await noSidewaysScroll(page);
});

for (const [name, want] of [
  ["a plain 12×12", { sizes: [12], challenges: (c) => c.length === 0 }],
  ["a hexagon", { sizes: [5, 6, 7, 8, 9, 10, 11, 12], challenges: (c) => c.includes("hexagon") }],
  ["a board that wraps", { sizes: [5, 6, 7, 8, 9, 10, 11, 12], challenges: (c) => c.includes("wrap") }],
  ["a 4×4", { sizes: [4], challenges: (c) => c.length === 0 }],
]) {
  test(`${name} fits the page without scrolling sideways, and its box does not move as it is drawn on`, async ({ page }) => {
    const level = findLevel((challenges) => want.challenges(challenges), { sizes: want.sizes });
    await open(page, levelUrl(level));
    await noSidewaysScroll(page);
    const box = page.locator(`${at("board")} .tsp-box`);
    const onPage = async (one) => ({ ...(await one.boundingBox()), y: (await one.boundingBox()).y + (await page.evaluate(() => window.scrollY)) });
    const first = await onPage(box);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await dragCells(page, board(page), level.layout, level.lines[0]);
    expect(await onPage(box)).toEqual(first);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
    await noSidewaysScroll(page);
    expect(first.width).toBeGreaterThan(200);
  });
}
