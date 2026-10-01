// The `<tsunagi-board>` element on a page holding nothing else: a level by size and number, a layout of its own,
// every attribute, the events it fires and the way a page drives it.
import { expect, test } from "@playwright/test";

import { bare, dragCells, levelOf } from "./demo.mjs";
import { checkTsunagiAnswer } from "../dist/index.js";

const tag = (page) => page.locator("tsunagi-board");

test("a tag with a size and a level draws that level and plays it", async ({ page }) => {
  const errors = await bare(page, '<tsunagi-board size="5" level="1"></tsunagi-board>');
  const level = levelOf(5, 1);
  await expect(tag(page).locator(".tsu-marble")).toHaveCount(level.layout.ends.length * 2);
  await dragCells(page, tag(page).locator("svg.tsunagi"), level.layout, level.lines[0]);
  await expect(tag(page).locator(".tsu-line")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("a tag with its own layout and answer plays it, and fires change, stroke and solve with an answer the server accepts", async ({ page }) => {
  const level = levelOf(5, 1);
  await bare(page, `<tsunagi-board size="5" givens="${level.givens}" answer="${level.answer}"></tsunagi-board>`);
  await page.evaluate(() => {
    window.told = [];
    for (const name of ["tsunagi-change", "tsunagi-stroke", "tsunagi-solve"]) document.querySelector("tsunagi-board").addEventListener(name, (event) => window.told.push([name, event.detail.answer, event.detail.helped, event.detail.progress.solved]));
  });
  for (const line of level.lines) await dragCells(page, tag(page).locator("svg.tsunagi"), level.layout, line);
  const told = await page.evaluate(() => window.told);
  const names = told.map(([name]) => name);
  expect(names.filter((name) => name === "tsunagi-stroke")).toHaveLength(level.layout.ends.length);
  expect(names.filter((name) => name === "tsunagi-solve")).toHaveLength(1);
  expect(names.filter((name) => name === "tsunagi-change").length).toBeGreaterThan(level.layout.ends.length);
  const solve = told.find(([name]) => name === "tsunagi-solve");
  expect(solve[2]).toBeNull();
  expect(solve[3]).toBe(true);
  expect(checkTsunagiAnswer(5, level.givens, solve[1]).ok).toBe(true);
});

test("changing an attribute changes the board at once: marks, fill, colour set, board, coordinates", async ({ page }) => {
  await bare(page, '<tsunagi-board size="5" level="1"></tsunagi-board>');
  const level = levelOf(5, 1);
  await dragCells(page, tag(page).locator("svg.tsunagi"), level.layout, level.lines.find((line) => line.length >= 4));
  await expect(tag(page).locator(".tsu-bead").first()).toBeVisible();
  await tag(page).evaluate((element) => {
    element.setAttribute("marks", "numbers");
    element.setAttribute("fill", "lines");
    element.setAttribute("board", "green");
    element.setAttribute("colour-set", "colour-blind");
    element.setAttribute("coordinates", "");
  });
  await expect(tag(page).locator(".tsu-num").first()).toBeVisible();
  await expect(tag(page).locator(".tsu-bead")).toHaveCount(0);
  await expect(tag(page).locator("svg.tsunagi")).toHaveAttribute("data-board", "green");
  await expect(tag(page).locator(".tsu-coordinate")).toHaveCount(10);
  // The line already drawn is still there: a look is not a new game.
  await expect(tag(page).locator(".tsu-line")).toHaveCount(1);
  await tag(page).evaluate((element) => element.removeAttribute("marks"));
  await expect(tag(page).locator(".tsu-num")).toHaveCount(0);
});

test("controls off draws only the board; chips adds the level's difficulty and its challenges", async ({ page }) => {
  await bare(page, '<tsunagi-board id="a" size="5" level="1" controls="off"></tsunagi-board><tsunagi-board id="b" size="5" level="15" chips></tsunagi-board>');
  await expect(page.locator("#a button:visible")).toHaveCount(0);
  await expect(page.locator("#a .tsp-progress")).toHaveCount(0);
  await expect(page.locator("#b button[data-chip]").first()).toBeVisible();
  await expect(page.locator('#b [data-chip="difficulty"]')).toBeVisible();
  const first = page.locator("#b button[data-chip]").nth(1);
  await first.click();
  await expect(page.locator("#b .tsp-says")).not.toBeEmpty();
  await expect(first).toHaveAttribute("aria-expanded", "true");
});

test("cheats on a level offers Cheat, whose solve is told as helped", async ({ page }) => {
  await bare(page, '<tsunagi-board size="4" level="1" cheats></tsunagi-board>');
  const level = levelOf(4, 1);
  await page.evaluate(() => {
    window.solved = [];
    document.querySelector("tsunagi-board").addEventListener("tsunagi-solve", (event) => window.solved.push([event.detail.helped, event.detail.answer]));
  });
  const cheat = tag(page).locator('[data-action="cheat"]');
  await expect(cheat).toBeVisible();
  for (let at = 0; at < level.layout.ends.length; at += 1) await cheat.click();
  const solved = await page.evaluate(() => window.solved);
  expect(solved).toHaveLength(1);
  expect(solved[0][0]).toBe("cheated");
  expect(checkTsunagiAnswer(4, level.givens, solved[0][1]).ok).toBe(true);
});

test("methods drive it, a kept game's progress is picked up again, and it speaks Japanese by its lang", async ({ page }) => {
  await bare(page, '<tsunagi-board size="5" level="1" lang="ja"></tsunagi-board>');
  const level = levelOf(5, 1);
  await expect(tag(page).locator('[data-action="undo"]')).toHaveText("元に戻す");
  await dragCells(page, tag(page).locator("svg.tsunagi"), level.layout, level.lines[0]);
  const code = await tag(page).evaluate((element) => element.mount.game().lines.length > 0 && element.progress.joined);
  expect(code).toBe(1);
  await tag(page).evaluate((element) => element.undo());
  await expect(tag(page).locator(".tsu-line")).toHaveCount(0);
  await tag(page).evaluate((element) => element.restart());
  const kept = await page.evaluate(
    ({ code }) => {
      const element = document.querySelector("tsunagi-board");
      element.setAttribute("progress", code);
      element.setAttribute("level", "2");
      element.setAttribute("level", "1");
      return true;
    },
    { code: "*" + ".".repeat(24) },
  );
  expect(kept).toBe(true);
});

test("on a page whose language is switched, the board follows without being told", async ({ page }) => {
  await bare(page, '<tsunagi-board size="5" level="1"></tsunagi-board>');
  await expect(tag(page).locator('[data-action="undo"]')).toHaveText("Undo");
  await page.evaluate(() => document.documentElement.setAttribute("lang", "ja"));
  await expect(tag(page).locator('[data-action="undo"]')).toHaveText("元に戻す");
  await page.evaluate(() => document.documentElement.setAttribute("lang", "en"));
  await expect(tag(page).locator('[data-action="undo"]')).toHaveText("Undo");
});

test("a tag taken out of the page takes its drawing with it, and put back it draws again", async ({ page }) => {
  await bare(page, '<div id="holder"><tsunagi-board size="5" level="1"></tsunagi-board></div>');
  await expect(page.locator("tsunagi-board svg.tsunagi")).toHaveCount(1);
  await page.evaluate(() => {
    const element = document.querySelector("tsunagi-board");
    window.held = element;
    element.remove();
  });
  expect(await page.evaluate(() => window.held.querySelectorAll("svg").length)).toBe(0);
  await page.evaluate(() => document.getElementById("holder").append(window.held));
  await expect(page.locator("tsunagi-board svg.tsunagi")).toHaveCount(1);
});
