// The documents and the demo, held to the source. Plain JavaScript, so that reading files needs no Node types.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { TSUNAGI_BOARD_NAMES } from "./boards.ts";
import { TSUNAGI_COLOUR_SET_NAMES } from "./colours.ts";
import { TsunagiBoard } from "./element.ts";
import { VERSION } from "./version.ts";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const readme = readFileSync("README.md", "utf8");

describe("the documents", () => {
  it("say the version package.json says, in the code and at the top of the changelog", () => {
    expect(VERSION).toBe(pkg.version);
    expect(readFileSync("CHANGELOG.md", "utf8")).toMatch(new RegExp(`^## ${pkg.version.replace(/\./g, "\\.")} `, "m"));
  });

  it("name in the README every entry package.json exports, and no other", () => {
    const exported = Object.keys(pkg.exports).filter((key) => key !== "." && !/^\.\/levels-\d+$/.test(key)).map((key) => `${pkg.name}/${key.slice(2)}`);
    for (const entry of exported) expect(readme, entry).toContain(`\`${entry}\``);
    expect(readme).toContain(`\`${pkg.name}/levels-4\` … \`/levels-15\``);
    const sizes = Object.keys(pkg.exports).filter((key) => /^\.\/levels-\d+$/.test(key)).map((key) => Number(key.slice(9)));
    expect(sizes).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
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
