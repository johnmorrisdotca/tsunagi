// The documents and the demo, held to the source. Plain JavaScript, so that reading files needs no Node types.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { TSUNAGI_BOARD_NAMES } from "./boards.ts";
import { PAIR_LETTERS } from "./code.ts";
import { TSUNAGI_COLOUR_SET_NAMES } from "./colours.ts";
import { TSUNAGI_DAILY_STRIDE } from "./daily.ts";
import { TsunagiBoard } from "./element.ts";
import { TSUNAGI_BLOCK } from "./levelBlocks.ts";
import { TSUNAGI_LEVEL_COUNTS, TSUNAGI_PORTAL_COUNTS, TSUNAGI_SIZES } from "./levelCounts.ts";
import { TSUNAGI_PLAY_STYLE } from "./playStyle.ts";
import { SAT_FROM_SIZE } from "./solve.ts";
import { TSUNAGI_STRINGS } from "./strings.ts";
import { TSUNAGI_STYLE } from "./style.ts";
import { VERSION } from "./version.ts";
import { TSUNAGI_MOST_ZOOM, TSUNAGI_ZOOM_FROM } from "./viewport.ts";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const readme = readFileSync("README.md", "utf8");

/** A README section's text, from its heading to the next heading of the same level. */
const section = (heading) => {
  const from = readme.indexOf(`\n## ${heading}\n`);
  if (from < 0) throw new Error(`no “## ${heading}” in the README`);
  const next = readme.indexOf("\n## ", from + 5);
  return readme.slice(from, next < 0 ? undefined : next);
};

/** The cells of every table row in a piece of text, header and rule rows left out. */
const rows = (text) =>
  text
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[\s|:-]+\|$/.test(line))
    .map((line) => line.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.replace(/\\\|/g, "|").trim()));

/** The custom properties a block of CSS declares: { name: value }. */
const declarations = (css) => Object.fromEntries([...css.matchAll(/(--[a-z0-9-]+):\s*([^;}]+)[;}]/g)].map((match) => [match[1], match[2].trim()]));

describe("the documents", () => {
  it("say the version package.json says, in the code and at the top of the changelog", () => {
    expect(VERSION).toBe(pkg.version);
    expect(readFileSync("CHANGELOG.md", "utf8")).toContain(`## [${pkg.version}] - `);
  });

  it("name in the README every entry package.json exports, and no other", () => {
    const exported = Object.keys(pkg.exports).filter((key) => key !== "." && !/^\.\/levels-\d+$/.test(key)).map((key) => `${pkg.name}/${key.slice(2)}`);
    for (const entry of exported) expect(readme, entry).toContain(`\`${entry}\``);
    expect(readme).toContain(`\`${pkg.name}/levels-4\` … \`/levels-15\``);
    const sizes = Object.keys(pkg.exports).filter((key) => /^\.\/levels-\d+$/.test(key)).map((key) => Number(key.slice(9)));
    expect(sizes).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30]);
  });

  it("name in the README every colour set, every board and every attribute of the element", () => {
    for (const name of [...TSUNAGI_COLOUR_SET_NAMES, ...TSUNAGI_BOARD_NAMES]) expect(readme, name).toContain(`\`${name}\``);
    for (const attribute of TsunagiBoard.observedAttributes) expect(readme, attribute).toMatch(new RegExp(`\`${attribute}[\`=]|\`${attribute}\``));
  });

  it("keep the family's stylesheet byte for byte, as its first line's hash says", () => {
    const [first, ...rest] = readFileSync("demo/family.css", "utf8").split("\n");
    const hash = /sha256 of every line after this one: ([0-9a-f]{64})/.exec(first)?.[1];
    expect(createHash("sha256").update(rest.join("\n")).digest("hex")).toBe(hash);
  });
});

describe("the README's promises", () => {
  it("has the sections a package of this family has, each with something in it", () => {
    for (const heading of ["In 30 seconds", "Who it is for", "Features", "Use it in your project", "API", "Theming", "Limits", "Browser support", "Languages", "Roadmap", "Architecture", "The name", "Where it comes from, and where it is used", "Development", "Contributing", "Changes", "Licence"]) {
      expect(section(heading).length, heading).toBeGreaterThan(heading.length + 40);
    }
  });

  it("installs the package it is, and every version it names is the one in package.json", () => {
    expect(readme).toContain(`npm install ${pkg.name}`);
    const major = pkg.version.split(".")[0];
    const named = [...readme.matchAll(/@johnmorrisdotca\/tsunagi@([\w.-]+)/g)].map((match) => match[1]);
    expect(named.length).toBeGreaterThan(0);
    for (const version of named) expect(version).toBe(major);
    expect(readme).not.toMatch(/\btsunagi@\d+\.\d+/);
  });

  it("links only to files that exist", () => {
    const targets = [...readme.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)/g)].map((match) => match[1]);
    expect(targets.length).toBeGreaterThan(3);
    for (const target of targets) expect(existsSync(target), target).toBe(true);
  });

  it("gives each size's number of levels as the code has it, and the total the first lines name", () => {
    const cells = rows(section("Levels")).flatMap((row) => row).filter((cell) => /^\d+×\d+$/.test(cell) || /^\d+$/.test(cell));
    const table = {};
    for (let at = 0; at < cells.length; at += 2) table[Number.parseInt(cells[at], 10)] = Number(cells[at + 1]);
    expect(table).toEqual(TSUNAGI_LEVEL_COUNTS);
    expect(TSUNAGI_SIZES.map(String).sort()).toEqual(Object.keys(table).sort());
    const total = Object.values(TSUNAGI_LEVEL_COUNTS).reduce((sum, count) => sum + count, 0);
    expect(readme).toContain(`${total.toLocaleString("en-US")} levels from 4×4 to 30×30`);
    expect(readFileSync("package.json", "utf8")).toContain(`${total.toLocaleString("en-US")} hand-checked levels`);
    // And the portal levels' own count, in the first lines.
    const portalTotal = Object.values(TSUNAGI_PORTAL_COUNTS).reduce((sum, count) => sum + count, 0);
    expect(readme).toContain(`and ${portalTotal} more with portals`);
  });

  it("lists every package of the family, with its kana, as the demo's footer does", () => {
    const template = readFileSync("scripts/family-template.mjs", "utf8");
    const family = [...template.matchAll(/\{ id: "([\w-]+)", name: "(\w+)", kana: "([^"]+)" \}/g)].map((match) => ({ id: match[1], name: match[2], kana: match[3] }));
    expect(family.length).toBeGreaterThanOrEqual(16);
    const block = readme.slice(readme.indexOf("### The family"), readme.indexOf("\n## ", readme.indexOf("### The family")));
    for (const { id, name, kana } of family) expect(block, id).toContain(`- [${name}](https://github.com/johnmorrisdotca/${id}) (${kana}`);
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two"];
    expect(block).toContain(`one of ${words[family.length]} packages`);
    expect([...block.matchAll(/^- \[/gm)]).toHaveLength(family.length);
  });

  it("gives every colour of the drawing, and of the playable board, with its light and dark values", () => {
    const light = declarations(TSUNAGI_STYLE.slice(0, TSUNAGI_STYLE.indexOf("@media")));
    const dark = declarations(TSUNAGI_STYLE.slice(TSUNAGI_STYLE.indexOf(':root[data-theme="dark"]')).split("}")[0]);
    const play = TSUNAGI_PLAY_STYLE.slice(TSUNAGI_STYLE.length);
    const playLight = declarations(play.slice(0, play.indexOf("@media")));
    const playDark = declarations(play.slice(play.indexOf(':root[data-theme="dark"]')).split("}")[0]);
    const table = Object.fromEntries(rows(section("Theming")).filter((row) => row[0].startsWith("`--")).map((row) => [row[0].replace(/`/g, ""), row]));
    expect(Object.keys(table).sort()).toEqual([...Object.keys(light), ...Object.keys(playLight)].sort());
    for (const [name, value] of Object.entries({ ...light, ...playLight })) {
      if (name === "--tsu-font") continue;
      const row = table[name];
      expect(row[2], name).toBe(`\`${value}\``);
      const other = { ...dark, ...playDark }[name];
      expect(row[3], name).toBe(other === undefined || other === value ? "the same" : `\`${other}\``);
    }
  });

  it("states the limits as the code has them", () => {
    const limits = section("Limits");
    expect(limits).toContain(`4×4 to ${Math.max(...TSUNAGI_SIZES)}×${Math.max(...TSUNAGI_SIZES)}`);
    expect(Math.min(...TSUNAGI_SIZES)).toBe(4);
    expect(PAIR_LETTERS).toHaveLength(82);
    expect(limits).toContain("eighty-two, one character each");
    expect(TSUNAGI_BLOCK).toBe(16);
    expect(limits).toContain(`from ${SAT_FROM_SIZE}×${SAT_FROM_SIZE}`);
    expect(limits).toContain(`from ${TSUNAGI_ZOOM_FROM}×${TSUNAGI_ZOOM_FROM}, up to ${TSUNAGI_MOST_ZOOM} times`);
    expect(readFileSync("src/solve.ts", "utf8")).toContain("limit = 2, budget = Number.POSITIVE_INFINITY");
    expect(limits).toContain("two, so that");
  });

  it("describes the level of the day as the code has it: a stride that is named, and every level of a size once before any twice", () => {
    expect(TSUNAGI_DAILY_STRIDE).toBe(97);
    expect(readme).toContain("every level of a size comes up once before any comes up again");
    expect(readme).toContain("`dailyTsunagiLevel(size, date)`");
  });

  it("keeps docs/strings-ja.md as the board's words, English beside Japanese (pnpm docs:make rewrites it)", () => {
    const cell = (text) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
    const lines = ["# Tsunagi's words, in English and Japanese", "", "Made from `src/strings.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.", "", "**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please", "open a *Fix a translation* issue with the string's name. `{name}` and the other braces are filled in when shown. A line\nwith `One` at the end of its name is the singular, said in English when the count is 1.", "", "| Name | English | Japanese |", "| --- | --- | --- |"];
    for (const key of Object.keys(TSUNAGI_STRINGS.en).filter((name) => !/One$/.test(name))) lines.push(`| \`${key}\` | ${cell(TSUNAGI_STRINGS.en[key])} | ${cell(TSUNAGI_STRINGS.ja[key] ?? "")} |`);
    const made = `${lines.join("\n")}\n`;
    if (process.env.UPDATE_DOCS === "1") writeFileSync("docs/strings-ja.md", made);
    expect(readFileSync("docs/strings-ja.md", "utf8")).toBe(made);
  });

  it("has the files a visitor looks for: issue templates, a pull request template, a security policy", () => {
    for (const file of [".github/ISSUE_TEMPLATE/report-a-bug.md", ".github/ISSUE_TEMPLATE/suggest-a-feature.md", ".github/ISSUE_TEMPLATE/fix-a-translation.md", ".github/ISSUE_TEMPLATE/add-my-project.md", ".github/ISSUE_TEMPLATE/config.yml", ".github/pull_request_template.md", "SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"]) expect(existsSync(file), file).toBe(true);
    expect(readme).toContain("issues/new?template=fix-a-translation.md");
  });

  it("keeps SECURITY.md and CODE_OF_CONDUCT.md equal to the family's master text, a copy of which is kept in scripts/community", () => {
    for (const file of ["SECURITY.md", "CODE_OF_CONDUCT.md"]) expect(readFileSync(file, "utf8"), file).toBe(readFileSync(`scripts/community/${file}`, "utf8"));
  });

  it("says Node 22 or later wherever it names a Node version", () => {
    for (const file of ["README.md", "CONTRIBUTING.md"]) expect(readFileSync(file, "utf8"), file).not.toMatch(/Node(?:\.js)? 20\b/);
    expect(readme).toContain("Node 22 or later");
  });
});
