import { VERSION } from "./dist/index.js";
import { TsunagiBoard, TSUNAGI_EMBED_OPTION_KEYS } from "./dist/element.js";
import { TSUNAGI_SIZES, TSUNAGI_LEVEL_COUNTS, TSUNAGI_PORTAL_COUNTS } from "./dist/levels.js";
import { TSUNAGI_BOARD_NAMES } from "./dist/boards.js";
import { TSUNAGI_COLOUR_SET_NAMES } from "./dist/colours.js";
import { embedDay } from "./dist/embed-day.js";
import "./dist/element-define.js";
import { familyEmbedBuilder, FAMILY_EMBED_BUILDER_WORDS } from "./family-embed-builder.js";
const words = {
  en: {
    ...FAMILY_EMBED_BUILDER_WORDS.en,
    pitch: "Choose a line puzzle or a UTC daily level, preview it, and copy the code for your page.",
    name: "Tsunagi means joining in Japanese.",
    nameLink: "About the name",
    foot: "The setup is in the link. No game or personal data is stored.",
    toGallery: "The puzzles",
    makerBoard: "A board",
    makerBoardSays: "Join the matching marbles and fill the board.",
    copyLink: "Copy a link to this puzzle",
    badDay: "Use a real UTC date written YYYY-MM-DD, today or off.",
    badLevel: "Choose a level that exists at this grid size."
  },
  ja: {
    ...FAMILY_EMBED_BUILDER_WORDS.ja,
    pitch: "繋のパズル、またはUTCの日替わり問題を選び、表示を確認して、ページに埋め込むコードをコピーできます。",
    name: "「繋」は英語の joining に当たる日本語です。",
    nameLink: "名前について",
    foot: "設定はリンクに入ります。ゲームや個人情報は保存しません。",
    toGallery: "パズルの一覧",
    makerBoard: "盤",
    makerBoardSays: "同じ玉をつないで、盤を埋めます。",
    copyLink: "このパズルへのリンクをコピー",
    badDay: "実在する日付をYYYY-MM-DD形式で入力するか、today または off を指定してください。UTCの日付を使います。",
    badLevel: "この盤の大きさにある問題を選んでください。"
  },
};
const row = (id, kind, en, ja, extra = {}) => ({ id, kind, group: "board", names: { board: id, ...(id === "size" ? {} : { mount: ({ grid: "size", lang: "language", "colour-set": "colours" }[id] ?? id) }) }, say: { en: { label: en[0], help: en[1] }, ja: { label: ja[0], help: ja[1] } }, ...extra });
const options = [
  row("set", "choice", ["Set", "Classic levels or levels with portals."], ["問題の種類", "いつもの問題、またはワープのある問題です。"], { choices: ["classic", "portals"], default: "classic" }),
  row("grid", "choice", ["Grid", "The cells on each side, supported by the chosen set."], ["盤の大きさ", "1辺のマスの数です。選んだ問題の種類に対応する大きさを選びます。"], { choices: TSUNAGI_SIZES.map(String), default: "7", control: "select" }),
  row("level", "number", ["Level", "A curated level; daily mode chooses the day's level."], ["問題", "収録された問題です。日替わりでは、その日の問題を選びます。"], { default: 1, range: { min: 1, max: 256, step: 1 } }),
  row("daily", "text", ["Daily", "YYYY-MM-DD, today or off; the day is counted in UTC."], ["日替わり", "YYYY-MM-DD、today、offを指定します。UTCの日付を使います。"]),
  row("size", "choice", ["Display size", "Small, medium or large; independent of the grid."], ["表示の大きさ", "小・中・大を選びます。盤のマスの数とは別です。"], { default: "medium", choices: ["small", "medium", "large"] }),
  row("width", "number", ["Width", "Pixels, fitting a narrower parent."], ["幅", "ピクセルで指定します。狭い表示枠にも収まります。"], { range: { min: 200, max: 1000, step: 10 } }),
  row("theme", "choice", ["Theme", "Light, dark or the device's preference."], ["配色", "明るい配色・暗い配色、または端末の設定に合わせます。"], { default: "auto", choices: ["auto", "light", "dark"] }),
  row("lang", "choice", ["Language", "The language of controls and spoken cells."], ["言語", "操作ボタンと読み上げるマスの言語です。"], { choices: ["en", "ja"] }),
  row("label", "text", ["Spoken label", "An optional screen-reader label."], ["読み上げる名前", "スクリーンリーダー用の名前です。指定は任意です。"]),
  row("marks", "choice", ["Marks", "Tell pairs apart by colours or numbers."], ["目印", "色、または数字で玉の組を区別します。"], { default: "colours", choices: ["colours", "numbers"] }),
  row("fill", "choice", ["Lines", "Draw marbles along the lines or plain lines."], ["線", "線の上に玉を描くか、線だけを描きます。"], { default: "marbles", choices: ["marbles", "lines"] }),
  row("colour-set", "choice", ["Palette", "A built-in colour palette."], ["色の組合せ", "収録された色の組合せです。"], { default: "marble", choices: TSUNAGI_COLOUR_SET_NAMES }),
  row("board", "choice", ["Board", "Paper, wood or a cloth."], ["盤", "紙、木、または布の盤です。"], { default: "paper", choices: TSUNAGI_BOARD_NAMES }),
  row("explosions", "choice", ["Explosions", "As written, softened or off."], ["爆発", "そのまま、やわらげる、なしから選びます。"], { default: "on", choices: ["on", "soft", "off"] }),
  row("zoom", "choice", ["Zoom", "Automatic for large grids, always on or off."], ["拡大", "大きな盤で自動、いつも使う、使わないから選びます。"], { default: "auto", choices: ["auto", "on", "off"] }),
  ...["coordinates", "cheats", "controls", "chips"].map((id, at) => row(id, "boolean", [["Coordinates", "Show rows and columns."], ["Cheat", "Offer an unfinished answer line."], ["Controls", "Show the buttons and progress lines."], ["Chips", "Show difficulty and challenges."]][at], [["座標", "行と列を表示します。"], ["ヒント", "未完成の答えの線を表示できます。"], ["操作ボタン", "ボタンと進み具合を表示します。"], ["特徴", "むずかしさと問題の特徴を表示します。"]][at], { default: id === "controls" })),
];

const leftOut = {};
for (const name of ["givens", "answer", "progress"]) for (const scope of ["board", "mount"]) leftOut[`${scope}.${name}`] = "Custom boards, answers and kept play state belong to host code; this builder chooses curated levels.";
leftOut["mount.lines"] = "Kept play state belongs to host code, not the setup link.";
leftOut["options.colours"] = "Custom palette arrays belong to host code; the builder offers named palettes.";
leftOut["options.board"] = "Custom board artwork belongs to host code; the builder offers named boards.";
for (const name of ["onChange", "onStroke", "onExplosion", "onSolve"]) leftOut[`mount.${name}`] = "Host callbacks belong to options; native events carry the same detail.";
const heights = {};
const key = (settings) => JSON.stringify(settings);
let mounted;
const page = globalThis.familyLanguage({ id: "tsunagi", words, onChange: () => mounted?.draw() });
const countOf = (settings) => (settings.set === "portals" ? TSUNAGI_PORTAL_COUNTS : TSUNAGI_LEVEL_COUNTS)[Number(settings.grid ?? 7)];
function problem(settings) { try { const day = embedDay(settings.daily); const count = countOf(settings); if (count === undefined) return "badLevel"; return day !== null || (Number.isInteger(Number(settings.level ?? 1)) && Number(settings.level ?? 1) >= 1 && Number(settings.level ?? 1) <= count) ? null : "badLevel"; } catch { return "badDay"; } }
const builder = familyEmbedBuilder({ id: "tsunagi", packageName: "@johnmorrisdotca/tsunagi", major: VERSION.split(".")[0], site: "https://johnmorrisdotca.github.io/tsunagi/", title: "Tsunagi · line puzzle", titleJa: "繋のパズルの埋め込み", options, leftOut, groups: { board: { en: "The puzzle", ja: "パズルの設定" } }, makers: { board: { names: "board", element: "board", tag: "tsunagi-board", embed: "embed/", required: ["grid", "level"], description: "makerBoardSays", formats: ["element", "iframe", "module", "react", "vue", "svelte", "angular", "html", "url"], width: 640, height: (settings) => heights[key(settings)] ?? ({ small: 680, medium: 840, large: 1000 }[settings.size] ?? 840) } }, code: ({ maker, format, settings }) => {
  if (problem(settings) !== null) return null;
  if ((format === "iframe" || format === "url") && settings.lang === undefined) return builder.codeFor(maker, format, options, { ...settings, lang: page.lang });
  return undefined;
} });
builder.validateCoverage({ board: TsunagiBoard.observedAttributes, mount: TSUNAGI_EMBED_OPTION_KEYS });
mounted = builder.mount({ words, language: () => page, initial: { board: { grid: "7", level: 1, size: "medium",  lang: page.lang } }, renderPreview: ({ stage, attrs, settings, note, say }) => {
  if (problem(settings) !== null) { note.textContent = say(problem(settings)); return { destroy() {} }; }
  const board = globalThis.document.createElement("tsunagi-board");
  for (const [name, value] of attrs) board.setAttribute(name, value);
  board.addEventListener("tsunagi-load", () => { const ratio = 1; const actual = board.getBoundingClientRect(); const intended = Math.min(Number(settings.width) || ({ small: 320, medium: 480, large: 640 }[settings.size] ?? 480), 624); const overhead = actual.height - actual.width * ratio; heights[key(settings)] = Math.ceil(intended * ratio + overhead) + 32; mounted?.refreshCode(); });
  stage.append(board);
  return { destroy() { board.remove(); } };
} });

const compatible = () => {
  const settings = mounted.settings; let count = countOf(settings);
  if (count === undefined) { const grid = globalThis.document.getElementById("opt-grid"); grid.value = "5"; grid.dispatchEvent(new globalThis.Event("change", { bubbles: true })); count = countOf(mounted.settings); }
  const level = globalThis.document.getElementById("opt-level"); if (level && Number(mounted.settings.level ?? 1) > count) { level.value = String(count); level.dispatchEvent(new globalThis.Event("input", { bubbles: true })); }
};
globalThis.document.getElementById("bld-groups").addEventListener("click", (event) => { if (event.target.closest("#opt-set button")) globalThis.queueMicrotask(compatible); });
globalThis.document.getElementById("bld-groups").addEventListener("change", (event) => { if (event.target.id === "opt-grid") globalThis.queueMicrotask(compatible); });
