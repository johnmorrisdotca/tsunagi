// The demo page's own script: a Tsunagi board to play, any size and any level, played by the package's own
// `mountTsunagi` (the drawing, the drag, Undo, Check, Cheat, the zoom), with every option the package has on a
// settings panel, a preview of the level's block, kept on this device between visits, and spoken in the language
// the header's chooser picks. The page itself only chooses a level, keeps what was solved and hands the settings on.
import { blockOf, blockRange, decodeLayout, decodeLines, helpOpensNext, linesOfAnswer, openTsunagiLevels, TSUNAGI_LEVEL_COUNTS, TSUNAGI_SIZES } from "./dist/index.js";
import { TSUNAGI_BOARDS, TSUNAGI_BOARD_NAMES, TSUNAGI_COLOUR_SET_NAMES, TSUNAGI_COLOUR_SETS, colourOfPair, drawTsunagi, hsl } from "./dist/draw-entry.js";
import { mountTsunagi } from "./dist/play-entry.js";
import { loadTsunagiLevels } from "./dist/levels.js";

// The page's own words, in the two languages it speaks. Set as text, never as HTML.
const WORDS = {
  en: {
    pageApi: "API reference",
    pitch: "Join each pair of marbles with a line. Lines never cross, and when every pair is joined, every cell is filled. Draw with a finger or the mouse, from a marble or from the end of a line.",
    name: "Tsunagi (繋ぎ) is Japanese for joining, a link.",
    nameLink: "About the name",
    size: "Size",
    level: "Level",
    previous: "Previous level",
    next: "Next level",
    open: (open, count) => `${open} of ${count} levels open: solve every level of a block of sixteen to open the next.`,
    look: "Look",
    play: "Help",
    marks: "Join by",
    colours: "Colours",
    numbers: "Numbers",
    fill: "Fill",
    marbles: "Dots",
    lines: "Lines",
    colourSet: "Colour set",
    colourSets: { marble: "Marble", bright: "Bright", "colour-blind": "Colour-blind", soft: "Soft" },
    board: "Board",
    boards: { paper: "Paper", wood: "Wood", green: "Green", blue: "Blue", red: "Red", black: "Black" },
    coordinates: "Coordinates",
    on: "On",
    off: "Off",
    explosions: "Explosions",
    explosionsOn: "Normal",
    explosionsSoft: "Softer",
    explosionsOff: "Off",
    cheating: "Cheating",
    cheatsOff: "Not allowed",
    cheatsOn: "Allowed",
    helpCosts: "A level solved with Cheat, or with explosions softened or off, counts as helped. With explosions off it does not open the next block.",
    solvedHere: "Solved",
    blockTitle: (block) => `Levels ${block}: the block you are in`,
    blockText: "Every level of a block of sixteen, as drawn: a level you have solved shows its answer, and one not open yet is dimmed.",
    levelLabel: (level, state) => `Level ${level}, ${state}`,
    states: { open: "open", solved: "solved", locked: "not open yet", here: "playing now" },
    moreTitle: "Using it",
    moreText: "The board above is the package itself: the rules, the drawing and every level. Each line below is all it takes.",
    tagTitle: "As a tag",
    tagText: "The same board in one element, with no framework: numbers, lines only, and the level's challenges under it.",
    foot: "Every level was made once and is proved on every build to have exactly one answer. Your progress stays on this device.",
  },
  ja: {
    pageApi: "API（英語）",
    pitch: "同じ色の玉どうしを線でつなぎます。線は交差できません。すべての組をつなぐと、すべてのマスが埋まります。玉か線の端から、指やマウスでなぞって描きます。",
    name: "「繋ぎ」は、つなぐこと、つながりという意味です。",
    nameLink: "名前について（英語）",
    size: "大きさ",
    level: "レベル",
    previous: "前のレベル",
    next: "次のレベル",
    open: (open, count) => `${count}レベル中${open}レベルが開いています。16レベルのまとまりをすべて解くと、次が開きます。`,
    look: "見た目",
    play: "助け",
    marks: "見分け方",
    colours: "色",
    numbers: "数字",
    fill: "線の中",
    marbles: "点",
    lines: "線だけ",
    colourSet: "色の組",
    colourSets: { marble: "ビー玉", bright: "あざやか", "colour-blind": "色覚にやさしい", soft: "やわらか" },
    board: "盤",
    boards: { paper: "紙", wood: "木目", green: "緑", blue: "青", red: "赤", black: "黒" },
    coordinates: "座標",
    on: "あり",
    off: "なし",
    explosions: "爆発",
    explosionsOn: "ふつう",
    explosionsSoft: "弱め",
    explosionsOff: "なし",
    cheating: "ヒント",
    cheatsOff: "使わない",
    cheatsOn: "使える",
    helpCosts: "ヒントを使ったり、爆発を弱めたりなしにして解くと、助けを借りたものとして数えます。爆発なしでは、次のまとまりは開きません。",
    solvedHere: "解けた",
    blockTitle: (block) => `レベル一覧：${block}番目のまとまり`,
    blockText: "16レベルのまとまりをそのまま描いています。解いたレベルは答えが見え、まだ開いていないレベルは薄くなります。",
    levelLabel: (level, state) => `レベル${level}、${state}`,
    states: { open: "開いている", solved: "解けた", locked: "まだ開いていない", here: "いま遊んでいる" },
    moreTitle: "使い方",
    moreText: "上の盤面は、このパッケージそのもの（ルール、描き方、すべてのレベル）で動いています。下の各行がそれぞれ必要なコードのすべてです。",
    tagTitle: "タグとして",
    tagText: "同じ盤面を、フレームワークなしの一つの要素で。数字、線だけ、盤の下にレベルの仕掛けも出ています。",
    foot: "どのレベルも一度だけ作られ、ビルドのたびに答えがちょうど一つであることが確かめられています。進み具合はこの端末に残ります。",
  },
};

const KEY = "tsunagi.page";
const params = new URLSearchParams(location.search);

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};
const write = (value) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Not remembered on this device; the board still plays. */
  }
};
const pick = (asked, allowed, kept, fallback) => (allowed.includes(asked) ? asked : allowed.includes(kept) ? kept : fallback);

const kept = read();
const look = {
  marks: pick(params.get("marks"), ["colours", "numbers"], kept.look?.marks, "colours"),
  fill: pick(params.get("fill"), ["marbles", "lines"], kept.look?.fill, "marbles"),
  colours: pick(params.get("colours"), TSUNAGI_COLOUR_SET_NAMES, kept.look?.colours, "marble"),
  board: pick(params.get("board"), TSUNAGI_BOARD_NAMES, kept.look?.board, "paper"),
  coordinates: params.has("coordinates") ? params.get("coordinates") !== "off" : kept.look?.coordinates === true,
};
const help = {
  explosions: pick(params.get("explosions"), ["on", "soft", "off"], kept.help?.explosions, "on"),
  cheats: params.has("cheats") ? params.get("cheats") !== "off" : kept.help?.cheats === true,
};
let size = TSUNAGI_SIZES.includes(Number(params.get("size"))) ? Number(params.get("size")) : TSUNAGI_SIZES.includes(kept.size) ? kept.size : 5;
let solved = kept.solved ?? {};
let helped = kept.helped ?? {};
let progress = kept.progress ?? {};
let level = 1;
let levels = [];
let mount = null;

const language = familyLanguage({ id: "tsunagi", words: WORDS, onChange: () => render() });
const say = (key, ...args) => {
  const word = WORDS[language.lang][key];
  return typeof word === "function" ? word(...args) : word;
};
const solvedSet = () => new Set(solved[size] ?? []);
const keep = () => write({ size, levels: kept.levels, solved, helped, progress, look, help });

const sizes = document.getElementById("sizes");
const host = document.getElementById("board");

function seg(parent, items, chosen, choose, labelOf, extra) {
  parent.replaceChildren(
    ...items.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.value = String(item);
      button.setAttribute("aria-pressed", String(item === chosen));
      extra?.(button, item);
      button.append(labelOf(item));
      button.addEventListener("click", () => choose(item));
      return button;
    }),
  );
}

/** A small square of a board, as the board patches of a colour picker show it. */
function patch(name) {
  const board = TSUNAGI_BOARDS[name];
  const paper = typeof board.paper === "string" ? board.paper : `linear-gradient(${board.paper[0]}, ${board.paper[1]})`;
  const span = document.createElement("span");
  span.className = "patch";
  span.style.background = paper;
  span.style.borderColor = board.frame;
  return span;
}

function marbleDots(set) {
  const dots = document.createElement("span");
  dots.className = "dots";
  for (let pair = 0; pair < 5; pair += 1) {
    const dot = document.createElement("i");
    dot.style.background = hsl(colourOfPair(TSUNAGI_COLOUR_SETS[set], pair));
    dots.append(dot);
  }
  return dots;
}

function settings() {
  const row = (id, items, chosen, choose, labelOf, extra) => seg(document.getElementById(id), items, chosen, choose, labelOf, extra);
  row("marks", ["colours", "numbers"], look.marks, (value) => change({ marks: value }), (value) => say(value));
  row("fill", ["marbles", "lines"], look.fill, (value) => change({ fill: value }), (value) => say(value));
  row("colour-set", TSUNAGI_COLOUR_SET_NAMES, look.colours, (value) => change({ colours: value }), (value) => say("colourSets")[value], (button, value) => button.append(marbleDots(value)));
  row("board-look", TSUNAGI_BOARD_NAMES, look.board, (value) => change({ board: value }), (value) => say("boards")[value], (button, value) => button.append(patch(value)));
  row("coordinates", [true, false], look.coordinates, (value) => change({ coordinates: value }), (value) => say(value ? "on" : "off"));
  row("explosions", ["on", "soft", "off"], help.explosions, (value) => changeHelp({ explosions: value }), (value) => say(`explosions${value[0].toUpperCase()}${value.slice(1)}`));
  row("cheats", [false, true], help.cheats, (value) => changeHelp({ cheats: value }), (value) => say(value ? "cheatsOn" : "cheatsOff"));
}

function change(next) {
  Object.assign(look, next);
  keep();
  mount?.set(look);
  settings();
  block();
}
function changeHelp(next) {
  Object.assign(help, next);
  keep();
  mount?.set(help);
  settings();
}

/** What a level in the block's preview is: playing now, solved, open or not open yet. */
function stateOf(each, open) {
  return each === level ? "here" : solvedSet().has(each) ? "solved" : each <= open ? "open" : "locked";
}

/** Sixteen levels of the block this one is in, each as its board is drawn, to choose from. */
function block() {
  const grid = document.getElementById("block");
  const count = TSUNAGI_LEVEL_COUNTS[size];
  const open = openTsunagiLevels(size, solvedSet());
  const { first, last } = blockRange(blockOf(level), count);
  document.getElementById("block-title").textContent = say("blockTitle", blockOf(level));
  const buttons = [];
  for (let each = first; each <= last; each += 1) {
    const row = levels[each - 1];
    if (row === undefined) continue;
    const layout = decodeLayout(row[0], size);
    const state = stateOf(each, open);
    const lines = solvedSet().has(each) ? linesOfAnswer(layout, row[1]) : null;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lv";
    button.dataset.level = String(each);
    button.dataset.state = state;
    button.dataset.solved = String(solvedSet().has(each));
    button.disabled = state === "locked";
    button.setAttribute("aria-label", say("levelLabel", each, say("states")[state]));
    button.innerHTML = drawTsunagi(layout, { ...look, lines: lines ?? undefined, coordinates: false, language: language.lang, label: "" });
    button.firstElementChild.setAttribute("aria-hidden", "true");
    button.firstElementChild.removeAttribute("role");
    const number = document.createElement("span");
    number.textContent = String(each);
    button.append(number);
    button.addEventListener("click", () => choose(size, each));
    buttons.push(button);
  }
  grid.replaceChildren(...buttons);
}

function render() {
  language.say();
  seg(sizes, TSUNAGI_SIZES, size, (each) => choose(each, null), (each) => `${each}×${each}`);
  const count = TSUNAGI_LEVEL_COUNTS[size];
  const open = openTsunagiLevels(size, solvedSet());
  document.getElementById("level-number").textContent = `${level}`;
  document.getElementById("level-of").textContent = ` / ${count}`;
  document.getElementById("previous").disabled = level <= 1;
  document.getElementById("next").disabled = level >= open;
  document.getElementById("open").textContent = say("open", open, count);
  settings();
  if (levels.length > 0) block();
}

function put() {
  const [givens, answer] = levels[level - 1];
  const layout = decodeLayout(givens, size);
  const done = solvedSet().has(level);
  // A level solved opens on its finished board; a level half drawn comes back as it was left.
  const lines = done ? linesOfAnswer(layout, answer) : decodeLines(layout, progress[`${size}/${level}`] ?? "");
  const entry = { size, givens, answer, level, lines: lines ?? undefined };
  if (mount === null) {
    mount = mountTsunagi(host, {
      ...entry,
      ...look,
      explosions: help.explosions,
      cheats: help.cheats,
      chips: true,
      onChange: (detail) => {
        const key = `${size}/${level}`;
        if (detail.lines.every((line) => line.length === 0) || detail.progress.solved) delete progress[key];
        else progress[key] = detail.code;
        keep();
      },
      onSolve: (detail) => {
        helped[size] = detail.helped === null ? (helped[size] ?? []).filter((each) => each !== level) : [...new Set([...(helped[size] ?? []), level])];
        if (helpOpensNext(detail.helped)) solved = { ...solved, [size]: [...new Set([...(solved[size] ?? []), level])] };
        keep();
        render();
      },
    });
  } else mount.load(entry);
  host.dataset.level = String(level);
}

async function choose(nextSize, nextLevel) {
  size = nextSize;
  levels = await loadTsunagiLevels(size);
  const count = TSUNAGI_LEVEL_COUNTS[size];
  const open = openTsunagiLevels(size, solvedSet());
  // A level named in the address opens, open or not, as a link to one does; otherwise only the open levels.
  const linked = nextLevel === null && params.has("level");
  const asked = nextLevel ?? (linked ? Number(params.get("level")) : (kept.levels?.[size] ?? 1));
  level = Math.min(Math.max(1, Number.isInteger(asked) ? asked : 1), linked ? count : open);
  params.delete("level");
  kept.size = size;
  kept.levels = { ...(kept.levels ?? {}), [size]: level };
  keep();
  put();
  render();
}

document.getElementById("previous").addEventListener("click", () => choose(size, level - 1));
document.getElementById("next").addEventListener("click", () => choose(size, level + 1));

void choose(size, null).then(() => {
  host.dataset.ready = "true";
});
