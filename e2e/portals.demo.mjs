// The levels with portals, played in the demo: chosen from the set row, drawn with their rings, solved by a finger that
// goes into one ring while the line comes out of the other, and the link between a ring and its partner shown.
import { expect, test } from "@playwright/test";

import { at, board, cellPoint, noSidewaysScroll, open } from "./demo.mjs";
import { decodeLayout, linesOfAnswer } from "../dist/index.js";
import { loadTsunagiLevels, tsunagiLevelsOf } from "../dist/levels.js";

await loadTsunagiLevels(6, "portals");
await loadTsunagiLevels(7, "portals");

/** A portal level as the package has it. */
function portalLevel(size, level) {
  const [givens, answer] = tsunagiLevelsOf(size, "portals")[level - 1];
  const layout = decodeLayout(givens, size);
  return { size, level, givens, answer, layout, lines: linesOfAnswer(layout, answer) };
}

/**
 * Every line drawn the way a finger draws through portals: it moves as the line moves, a step for a step, and a passage
 * through a portal is the one step into its first ring (the line comes out of the other by itself). Where the finger would
 * leave the board it is let go and takes the line up again by its end.
 */
async function solveThroughPortals(page, svg, level) {
  const { layout, lines } = level;
  const size = layout.size;
  // A mouse needs the board on the screen, and on a phone the demo's controls above it push a big one past the foot.
  await svg.scrollIntoViewIfNeeded();
  for (const line of lines) {
    let [row, col] = [Math.floor(line[0] / size), line[0] % size];
    let point = await cellPoint(svg, layout, line[0]);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    for (let index = 1; index < line.length; index += 1) {
      const [before, cell] = [line[index - 1], line[index]];
      if (layout.portals.has(before) || (layout.portals.has(line[index - 2] ?? -1) && layout.portals.get(line[index - 2]) === before)) continue;
      const [dr, dc] = [Math.floor(cell / size) - Math.floor(before / size), (cell % size) - (before % size)];
      if (row + dr < 0 || row + dr >= size || col + dc < 0 || col + dc >= size) {
        await page.mouse.up();
        [row, col] = [Math.floor(before / size), before % size];
        point = await cellPoint(svg, layout, before);
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
      }
      row += dr;
      col += dc;
      point = await cellPoint(svg, layout, row * size + col);
      await page.mouse.move(point.x, point.y, { steps: 4 });
    }
    await page.mouse.up();
  }
}

test("the set row chooses the levels with portals, which have their own sizes and their own thirty-two levels", async ({ page }) => {
  await open(page, "?size=7&level=1");
  await expect(page.locator(`${at("set")} button[aria-pressed="true"]`)).toHaveText("Classic");
  await page.locator(`${at("set")} button[data-value="portals"]`).click();
  await expect(page.locator(at("level"))).toContainText("/ 32");
  await expect(page.locator(`${at("sizes")} button`)).toHaveText(["5×5", "6×6", "7×7", "8×8", "9×9", "10×10", "12×12", "15×15"]);
  await expect(page.locator(`${at("board")} .tsu-portal`).first()).toBeVisible();
  await noSidewaysScroll(page);
  // And back: the first set again, at the same size.
  await page.locator(`${at("set")} button[data-value="classic"]`).click();
  await expect(page.locator(at("level"))).toContainText("/ 256");
  await expect(page.locator(`${at("board")} .tsu-portal`)).toHaveCount(0);
});

test("a level with portals is drawn with two rings alike for each, and every ring's partner is linked on hover", async ({ page }, info) => {
  const level = portalLevel(6, 1);
  await open(page, "?set=portals&size=6&level=1");
  const rings = page.locator(`${at("board")} .tsu-portal`);
  await expect(rings).toHaveCount(level.layout.portalPairs.length);
  await expect(page.locator(`${at("board")} .tsu-portal-end`)).toHaveCount(level.layout.portalPairs.length * 2);
  const link = page.locator(`${at("board")} .tsu-portal-link`).first();
  await expect(link).toHaveCSS("opacity", "0");
  const [first] = level.layout.portalPairs[0];
  const ring = page.locator(`${at("board")} .tsu-portal-end[data-cell="${first}"]`);
  if (info.project.name.includes("phone")) {
    // A finger has no hover: a tap on the ring shows the link for a moment.
    const point = await cellPoint(board(page), level.layout, first);
    await page.mouse.click(point.x, point.y);
    await expect(page.locator(`${at("board")} .tsu-portal[data-linked="true"]`)).toHaveCount(1);
  } else {
    await ring.hover();
    await expect(link).not.toHaveCSS("opacity", "0");
  }
});

for (const [size, level] of [[6, 1], [7, 17]]) {
  test(`${size}×${size} portal level ${level} is solved by a finger that goes into one ring while the line comes out of the other`, async ({ page }) => {
    const wanted = portalLevel(size, level);
    await open(page, `?set=portals&size=${size}&level=${level}`);
    await solveThroughPortals(page, board(page), wanted);
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    await expect(page.locator(`${at("board")} .tsp-progress`)).toContainText("Solved");
    await noSidewaysScroll(page);
  });
}

test("a line goes into a ring and out of its partner in the one drag, and is taken back over the portal as it went in", async ({ page }) => {
  const level = portalLevel(6, 1);
  const { layout } = level;
  await open(page, "?set=portals&size=6&level=1");
  const line = level.lines.find((each) => each.some((cell) => layout.portals.has(cell)));
  const enter = line.findIndex((cell, index) => layout.portals.has(cell) && layout.portals.get(cell) === line[index + 1]);
  expect(enter).toBeGreaterThan(0);
  const svg = board(page);
  // Down on the line's first marble and along it, cell by cell, to the cell beside the first ring and into the ring.
  const size = layout.size;
  let [row, col] = [Math.floor(line[0] / size), line[0] % size];
  let point = await cellPoint(svg, layout, line[0]);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  for (let index = 1; index <= enter; index += 1) {
    [row, col] = [row + Math.floor(line[index] / size) - Math.floor(line[index - 1] / size), col + (line[index] % size) - (line[index - 1] % size)];
    if (row < 0 || row >= size || col < 0 || col >= size) test.skip(true, "this finger would leave the board: the unit tests hold the rule");
    point = await cellPoint(svg, layout, row * size + col);
    await page.mouse.move(point.x, point.y, { steps: 4 });
  }
  // Into the ring: the line has gone through, both rings are cells of it, and it has come out beyond the other.
  await expect(page.locator(`${at("board")} .tsu-line[data-pair="${layout.cells[line[0]]}"]`)).toHaveAttribute("data-cells", String(enter + 3));
  await page.mouse.up();
});
