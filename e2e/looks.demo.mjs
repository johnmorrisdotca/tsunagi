// The options the settings panel offers, each changed as a person changes it: numbers or colours on the marbles,
// dots or lines, a colour set, a board, the coordinates. The choice is on the page, comes back after a reload,
// and never moves the board's box.
import { expect, test } from "@playwright/test";

import { at, board, dragCells, findLevel, levelOf, noSidewaysScroll, open, solveByDragging } from "./demo.mjs";

const press = (page, group, value) => page.locator(`${at(group)} button[data-value="${value}"]`).click();
/** The board's box on the page, not on the screen: the same wherever the page is scrolled to. */
const boxOf = async (page) => {
  const box = await page.locator(`${at("board")} .tsp-box`).boundingBox();
  const scroll = await page.evaluate(() => window.scrollY);
  return { ...box, y: box.y + scroll };
};

test("Numbers puts each pair's number on its marbles, Colours takes it off, and the choice comes back after a reload", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const pairs = levelOf(5, 1).layout.ends.length;
  await expect(page.locator(`${at("board")} .tsu-num`)).toHaveCount(0);
  await press(page, "marks", "numbers");
  await expect(page.locator(`${at("board")} .tsu-num`)).toHaveCount(pairs * 2);
  await expect(page.locator(`${at("board")} .tsu-marble[data-pair="0"] .tsu-num`).first()).toHaveText("1");
  await expect(page.locator(`${at("board")} .tsu-marble[data-pair="${pairs - 1}"] .tsu-num`).first()).toHaveText(String(pairs));
  await expect(board(page)).toHaveAttribute("data-marks", "numbers");
  await page.goto("http://tsunagi.test/?size=5&level=1");
  await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
  await expect(page.locator(`${at("board")} .tsu-num`)).toHaveCount(pairs * 2);
  await press(page, "marks", "colours");
  await expect(page.locator(`${at("board")} .tsu-num`)).toHaveCount(0);
});

test("numbers draw the lines in a soft tint and still solve the level", async ({ page }) => {
  await open(page, "?size=5&level=1&marks=numbers");
  const level = levelOf(5, 1);
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  const stroke = await page.locator(`${at("board")} .tsu-line polyline`).first().getAttribute("stroke");
  expect(stroke).toMatch(/^hsl\(\d+, 30%, 62%\)$/);
});

test("Dots put a small marble in every cell a line runs through, and Lines draws the line alone", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  const line = level.lines.find((each) => each.length >= 4);
  await dragCells(page, board(page), level.layout, line);
  await expect(page.locator(`${at("board")} .tsu-bead`)).toHaveCount(line.length - 2);
  await press(page, "fill", "lines");
  await expect(page.locator(`${at("board")} .tsu-bead`)).toHaveCount(0);
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(1);
  await expect(board(page)).toHaveAttribute("data-fill", "lines");
  await press(page, "fill", "marbles");
  await expect(page.locator(`${at("board")} .tsu-bead`)).toHaveCount(line.length - 2);
});

test("a colour set repaints the marbles, and every set has its own colours", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const colour = () => page.locator(`${at("board")} radialGradient`).first().locator("stop").nth(1).getAttribute("stop-color");
  const seen = new Set([await colour()]);
  for (const set of ["bright", "colour-blind", "soft"]) {
    await press(page, "colour-set", set);
    seen.add(await colour());
  }
  expect(seen.size).toBe(4);
});

test("a board changes the paper, the frame and the rules, and the plain paper follows the page", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const frame = () => page.locator(`${at("board")} .tsu-frame`).evaluate((element) => getComputedStyle(element).fill);
  const paper = await frame();
  for (const name of ["wood", "green", "blue", "red", "black"]) {
    await press(page, "board-look", name);
    await expect(board(page)).toHaveAttribute("data-board", name);
    expect(await frame()).not.toBe(paper);
  }
  await press(page, "board-look", "paper");
  expect(await frame()).toBe(paper);
});

test("Coordinates put a letter over each column and a number beside each row", async ({ page }) => {
  await open(page, "?size=5&level=1");
  await expect(page.locator(`${at("board")} .tsu-coordinate`)).toHaveCount(0);
  await press(page, "coordinates", "true");
  await expect(page.locator(`${at("board")} .tsu-coordinate`)).toHaveCount(10);
  await expect(page.locator(`${at("board")} .tsu-coordinate`).first()).toHaveText("A");
  // A line is still drawn where the finger is, with the coordinates in the frame.
  const level = levelOf(5, 1);
  const { tsunagiGeometry } = await import("../dist/draw-entry.js");
  const svg = board(page);
  await svg.scrollIntoViewIfNeeded();
  const geometry = tsunagiGeometry(level.layout, { coordinates: true });
  const box = await svg.boundingBox();
  const at0 = geometry.centre(level.lines[0][0]);
  const at1 = geometry.centre(level.lines[0][1]);
  await page.mouse.move(box.x + (at0.x / geometry.side) * box.width, box.y + (at0.y / geometry.side) * box.height);
  await page.mouse.down();
  await page.mouse.move(box.x + (at1.x / geometry.side) * box.width, box.y + (at1.y / geometry.side) * box.height, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(1);
});

test("nothing moves when an option is chosen: the board's box and the page's height are the same", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  const first = await boxOf(page);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await press(page, "marks", "numbers");
  await press(page, "fill", "lines");
  await press(page, "colour-set", "soft");
  await press(page, "board-look", "wood");
  await dragCells(page, board(page), level.layout, level.lines[0]);
  await page.locator(`${at("board")} [data-action="check"]`).click();
  expect(await boxOf(page)).toEqual(first);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
});

test("the pieces drawn to be played cannot be selected, dragged or double-tapped into a selection", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const level = levelOf(5, 1);
  expect(await page.locator(`${at("board")} .tsp-box`).evaluate((element) => getComputedStyle(element).userSelect)).toBe("none");
  expect(await board(page).evaluate((element) => getComputedStyle(element).userSelect)).toBe("none");
  expect(await page.locator(`${at("board")} .tsp-box`).evaluate((element) => getComputedStyle(element).touchAction)).toBe("none");
  const marble = page.locator(`${at("board")} .tsu-marble[data-cell="${level.layout.ends[0][0]}"]`);
  await marble.dblclick();
  await marble.click({ clickCount: 3 });
  expect(await page.evaluate(() => String(window.getSelection()))).toBe("");
});

test("every option is spoken in Japanese when the page is", async ({ page }) => {
  await open(page, "?size=5&level=1&lang=ja");
  await expect(page.locator(`${at("board")} [data-action="undo"]`)).toHaveText("元に戻す");
  await expect(page.locator(`${at("board")} [data-action="check"]`)).toHaveText("確かめる");
  await expect(page.locator(`${at("board")} .tsp-progress`)).toContainText("組中0組");
  await expect(page.locator(`${at("board")} .tsu-marble`).first()).toHaveAttribute("aria-label", /^玉1、/);
  await press(page, "marks", "numbers");
  await expect(page.locator(`${at("board")} .tsu-num`).first()).toHaveText("1");
  await noSidewaysScroll(page);
});

test("the block shows its sixteen levels as drawn, and a level not open yet is dimmed", async ({ page }) => {
  await open(page, "?size=5&level=1");
  await expect(page.locator(`${at("block")} .lv`)).toHaveCount(16);
  await expect(page.locator(`${at("block")} .lv svg.tsunagi`)).toHaveCount(16);
  await page.goto("http://tsunagi.test/?size=5&level=17");
  await page.waitForSelector(`${at("board")}[data-ready="true"] svg.tsunagi`);
  await expect(page.locator(`${at("block")} .lv[data-state="locked"]`)).toHaveCount(15);
  await expect(page.locator(`${at("block")} .lv[data-state="here"]`)).toHaveCount(1);
  await expect(page.locator(`${at("block")} .lv[data-state="locked"]`).first()).toBeDisabled();
});

test("the next level opens when a block is solved, and a level chosen from the block is played", async ({ page }) => {
  await open(page, "?size=4&level=1");
  await page.locator(`${at("block")} .lv[data-level="5"]`).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "5");
  await expect(page.locator(`${at("block")} .lv[data-level="5"]`)).toHaveAttribute("data-state", "here");
  await page.locator(at("next")).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "6");
});

test("the tag on the page plays the same board in numbers and lines, with the level's chips", async ({ page }) => {
  await open(page, "?size=5&level=1");
  const tag = page.locator(at("tag"));
  await expect(tag.locator(".tsu-num").first()).toBeVisible();
  await expect(tag.locator("svg.tsunagi")).toHaveAttribute("data-fill", "lines");
  await expect(tag.locator('[data-chip="difficulty"]')).toBeVisible();
  const level = levelOf(5, 2);
  await dragCells(page, tag.locator("svg.tsunagi"), level.layout, level.lines[0]);
  await expect(tag.locator(`.tsu-line[data-pair="0"]`)).toHaveCount(1);
  // The page's own board is not touched.
  await expect(page.locator(`${at("board")} .tsu-line`)).toHaveCount(0);
});

test("a level with a bridge hides the line going down under the deck and draws the line going across over it", async ({ page }) => {
  const level = findLevel((challenges) => challenges.includes("bridges") && !challenges.includes("walls") && !challenges.includes("explosions"), { sizes: [7, 8, 6, 5] });
  await open(page, `?size=${level.size}&level=${level.level}`);
  await solveByDragging(page, board(page), level);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  const bridges = level.layout.cells.filter((cell) => cell === -3).length;
  await expect(page.locator(`${at("board")} .tsu-bridge`)).toHaveCount(bridges);
  await expect(page.locator(`${at("board")} .tsu-over-bridge`)).toHaveCount(bridges);
  // The lines are drawn under a mask that cuts every deck out, and the line across is drawn outside it, above the deck.
  expect(await page.locator(`${at("board")} .tsu-line`).first().evaluate((element) => element.parentElement.getAttribute("mask"))).toMatch(/^url\(#/);
  expect(await page.locator(`${at("board")} .tsu-over-bridge`).first().evaluate((element) => element.closest("[mask]"))).toBeNull();
  const order = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[data-testid="board"] svg.tsunagi > *')];
    return [all.findIndex((element) => element.classList.contains("tsu-lines")), all.findIndex((element) => element.classList.contains("tsu-bridge"))];
  });
  expect(order[1]).toBeGreaterThan(order[0]);
  // At the deck's middle the pixel is the over line's colour: what is on top there is the line going across, not the one going down.
  const over = await page.locator(`${at("board")} .tsu-over-bridge`).first().evaluate((element) => ({ stroke: element.getAttribute("stroke"), pair: element.dataset.pair }));
  const bridge = page.locator(`${at("board")} .tsu-bridge`).first();
  const hit = await bridge.evaluate((element) => {
    const rect = element.querySelector(".tsu-deck").getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return top === null ? null : { cls: top.getAttribute("class"), pair: top.dataset.pair ?? top.parentElement?.dataset.pair };
  });
  expect(hit?.cls).toBe("tsu-over-bridge");
  expect(hit?.pair).toBe(over.pair);
});
