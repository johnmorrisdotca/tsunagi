import { embedSnippet } from "@johnmorrisdotca/kazoku-ui/embed-panel";
import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
import { TSUNAGI_BOARD_NAMES } from "./dist/boards.js";
import { VERSION } from "./dist/index.js";
import { TSUNAGI_LEVEL_COUNTS, TSUNAGI_PORTAL_COUNTS } from "./dist/levels.js";

const SITE = "https://johnmorrisdotca.github.io/tsunagi/";
const WORDS = {
  en: {
    pick: "Grid for the code",
    level: "Level",
    portals: "Portals",
    board: "Board",
    boards: { paper: "Paper", wood: "Wood", green: "Green", blue: "Blue", red: "Red", black: "Black" },
  },
  ja: {
    pick: "コードの盤の大きさ",
    level: "レベル",
    portals: "ワープ",
    board: "盤",
    boards: { paper: "紙", wood: "木目", green: "緑", blue: "青", red: "赤", black: "黒" },
  },
};
const panel = document.getElementById("embed-panel");
const level = document.getElementById("embed-level");
const portalsButton = document.getElementById("embed-portals");
const boards = document.getElementById("embed-boards");
const major = VERSION.split(".")[0];
const lang = () => (document.documentElement.lang === "ja" ? "ja" : "en");
const words = () => WORDS[lang()];
let grid = "7";
let portals = false;
let board = "paper";
const counts = () => (portals ? TSUNAGI_PORTAL_COUNTS : TSUNAGI_LEVEL_COUNTS);

const attrs = (size) => [
  ["grid", grid],
  ["level", String(level.valueAsNumber || 1)],
  ...(portals ? [["set", "portals"]] : []),
  ...(board === "paper" ? [] : [["board", board]]),
  ...(size === 480 ? [] : [["width", String(size)]]),
];
const query = () =>
  attrs(480)
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
const spec = (size, preview) => ({
  package: "@johnmorrisdotca/tsunagi",
  cdn: `https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@${major}`,
  tag: "tsunagi-board",
  element: "element/define",
  entries: [],
  attrs: attrs(size),
  name: "tsunagi",
  iframe: {
    src: `${preview ? "" : SITE}embed/?${query()}`,
    title: "Tsunagi line puzzle",
    width: size + 16,
    height: size + 190,
  },
});
const refresh = () => {
  panel.openHref = `embed/?${query()}`;
  panel.update();
};
const picker = document.getElementById("embed-picker");
for (const id of Object.keys(TSUNAGI_LEVEL_COUNTS)) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.id = id;
  button.textContent = `${id}×${id}`;
  button.addEventListener("click", () => {
    grid = id;
    if (portals && TSUNAGI_PORTAL_COUNTS[grid] === undefined) portals = false;
    if (level.valueAsNumber > counts()[grid]) level.value = "1";
    draw();
    refresh();
  });
  picker.append(button);
}
const draw = () => {
  panel.setAttribute("lang", lang());
  picker.setAttribute("aria-label", words().pick);
  for (const button of picker.querySelectorAll("button"))
    button.setAttribute("aria-pressed", String(button.dataset.id === grid));
  level.max = String(counts()[grid]);
  document.querySelector('label[for="embed-level"]').textContent = words().level;
  portalsButton.textContent = words().portals;
  portalsButton.setAttribute("aria-pressed", String(portals));
  portalsButton.disabled = TSUNAGI_PORTAL_COUNTS[grid] === undefined;
  document.getElementById("embed-boards-label").textContent = words().board;
  for (const button of boards.querySelectorAll("button")) {
    button.textContent = words().boards[button.dataset.board];
    button.setAttribute("aria-pressed", String(button.dataset.board === board));
  }
  panel.update();
};

for (const name of TSUNAGI_BOARD_NAMES) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.board = name;
  button.addEventListener("click", () => {
    board = name;
    draw();
    refresh();
  });
  boards.append(button);
}
panel.generate = ({ kind, size, preview }) => embedSnippet(kind, spec(size, preview));
panel.preview = ({ kind, size }) => {
  if (kind === "iframe") return undefined;
  const element = document.createElement("tsunagi-board");
  for (const [name, value] of attrs(size)) element.setAttribute(name, value);
  return element;
};
level.addEventListener("input", () => {
  if (level.valueAsNumber >= 1 && level.valueAsNumber <= counts()[grid]) refresh();
});
portalsButton.addEventListener("click", () => {
  portals = !portals;
  if (level.valueAsNumber > counts()[grid]) level.value = "1";
  draw();
  refresh();
});
document.addEventListener("kazoku-languagechange", () => {
  draw();
  refresh();
});
draw();
refresh();
