// The demo page's own script: a Tsunagi board to play, any size and any level, drawn in SVG from
// the package's own functions, kept on this device between visits, and spoken in the language the
// header's chooser picks.
import { allJoined, answerOf, challengesOf, CELL_BLOCKED, CELL_BRIDGE, decodeLayout, dragThrough, explosionAfter, filled, inHex, letGo, noLines, pressAt, strokesToExplosion } from "./dist/index.js";
import { loadTsunagiLevels, openTsunagiLevels, TSUNAGI_LEVEL_COUNTS, TSUNAGI_SIZES } from "./dist/levels.js";

// The page's own words, in the two languages it speaks. Set as text, never as HTML.
const WORDS = {
  en: {
    pitch: "Join each pair of marbles with a line. Lines never cross, and when every pair is joined, every cell is filled. Draw with a finger or the mouse, from a marble or from the end of a line.",
    name: "Tsunagi (繋ぎ) is Japanese for joining, a link.",
    nameLink: "About the name",
    size: "Size",
    level: "Level",
    previous: "Previous level",
    next: "Next level",
    reset: "Clear the board",
    solved: "Solved. Every pair is joined and every cell is filled.",
    joinedAll: "Every pair is joined, but some cells are empty: every cell must have a line through it.",
    cells: (done, of) => `${done} of ${of} cells filled`,
    strokesLeft: (left) => `${left} ${left === 1 ? "stroke" : "strokes"} left`,
    outOfStrokes: "Out of strokes. Clear the board and try again.",
    boomIn: (left) => (left === 1 ? "A line breaks after the next stroke" : `A line breaks in ${left} strokes`),
    boom: "Boom! A line was cut back to half.",
    blast: "Blast! A line was wiped, and the one beside it cut back to half.",
    twist: "This level's twist:",
    twists: { bridges: "bridges, crossed one line each way", walls: "walls no line may pass", waypoints: "waypoints, passed by their own line", wrap: "edges that join, left to right and top to bottom", explosions: "explosions that break a line", strokes: "a limit on strokes", hexagon: "a board of hexagons", sparse: "few marbles, long lines" },
    open: (open, count) => `${open} of ${count} levels open: solve every level of a block of sixteen to open the next.`,
    moreTitle: "Using it",
    moreText: "The board above is the package itself: the rules, the drawing and every level. Each line below is all it takes.",
    foot: "Every level was made once and is proved on every build to have exactly one answer. Your progress stays on this device.",
  },
  ja: {
    pitch: "同じ色の玉どうしを線でつなぎます。線は交差できません。すべての組をつなぐと、すべてのマスが埋まります。玉か線の端から、指やマウスでなぞって描きます。",
    name: "「繋ぎ」は、つなぐこと、つながりという意味です。",
    nameLink: "名前について（英語）",
    size: "大きさ",
    level: "レベル",
    previous: "前のレベル",
    next: "次のレベル",
    reset: "盤面を消す",
    solved: "解けました。すべての組がつながり、すべてのマスが埋まりました。",
    joinedAll: "すべての組がつながりましたが、空いているマスがあります。すべてのマスに線を通してください。",
    cells: (done, of) => `${of}マス中${done}マス`,
    strokesLeft: (left) => `残り${left}筆`,
    outOfStrokes: "筆数がなくなりました。盤面を消して、もう一度どうぞ。",
    boomIn: (left) => (left === 1 ? "次の一筆で線が壊れます" : `あと${left}筆で線が壊れます`),
    boom: "ドカン！線が半分に切られました。",
    blast: "バーン！線が一本消え、隣の線も半分に切られました。",
    twist: "このレベルの仕掛け：",
    twists: { bridges: "橋（縦と横に一本ずつ通る）", walls: "線が通れない壁", waypoints: "決まった線が通る中継点", wrap: "左右と上下がつながった盤", explosions: "線を壊す爆発", strokes: "筆数の制限", hexagon: "六角形の盤", sparse: "玉が少なく線が長い盤" },
    open: (open, count) => `${count}レベル中${open}レベルが開いています。16レベルのまとまりをすべて解くと、次が開きます。`,
    moreTitle: "使い方",
    moreText: "上の盤面は、このパッケージそのもの（ルール、描き方、すべてのレベル）で動いています。下の各行がそれぞれ必要なコードのすべてです。",
    foot: "どのレベルも一度だけ作られ、ビルドのたびに答えがちょうど一つであることが確かめられています。進み具合はこの端末に残ります。",
  },
};

// A colour for each pair, A to P: told apart at a glance, and readable on the paper of the board.
const COLOURS = ["#d7263d", "#1b6ca8", "#f2a541", "#2e933c", "#8e44ad", "#e86a92", "#16a3a3", "#7a4b2a", "#f25c05", "#4b5d67", "#a3b915", "#c2185b", "#3949ab", "#00897b", "#b8860b", "#6d4c41"];
const KEY = "tsunagi.page";
const svgNS = "http://www.w3.org/2000/svg";

const board = document.getElementById("board");
const sizes = document.getElementById("sizes");
const levelLine = document.getElementById("level");
const status = document.getElementById("status");
const note = document.getElementById("note");

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

const kept = read();
let size = TSUNAGI_SIZES.includes(kept.size) ? kept.size : 5;
let solved = kept.solved ?? {};
let level = 1;
let levels = [];
let layout = null;
let givens = "";
let answer = "";
let lines = [];
let drawing = null;
let before = null;
let strokes = 0;
let said = null;

const language = familyLanguage({ id: "tsunagi", words: WORDS, onChange: () => render() });
const say = (key, ...args) => {
  const word = WORDS[language.lang][key];
  return typeof word === "function" ? word(...args) : word;
};
const solvedHere = () => new Set(solved[size] ?? []);

/** Where each cell's middle is, in the board's 0 to 100 box: a square of squares, or a hexagon of hexagons sheared from it. */
function centres() {
  const at = [];
  for (let cell = 0; cell < size * size; cell += 1) {
    const col = cell % size;
    const row = Math.floor(cell / size);
    at.push(layout.hex ? { x: col + row / 2, y: row * 0.866 } : { x: col, y: row });
  }
  const used = at.filter((_, cell) => !layout.hex || inHex(size, cell));
  const left = Math.min(...used.map((p) => p.x));
  const top = Math.min(...used.map((p) => p.y));
  const span = Math.max(Math.max(...used.map((p) => p.x)) - left, Math.max(...used.map((p) => p.y)) - top) + 1;
  const scale = 100 / span;
  return { scale, at: at.map((p) => ({ x: (p.x - left + 0.5) * scale, y: (p.y - top + 0.5) * scale })) };
}

function node(name, attributes, parent) {
  const element = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  parent.append(element);
  return element;
}

/** A hexagon's corners about a centre, pointy at the top, as an SVG points list. */
function hexPoints(x, y, radius) {
  return Array.from({ length: 6 }, (_, k) => {
    const angle = (Math.PI / 3) * k + Math.PI / 6;
    return `${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`;
  }).join(" ");
}

function draw() {
  board.replaceChildren();
  if (layout === null) return;
  const { scale, at } = centres();
  const half = scale / 2;
  const cells = node("g", {}, board);
  for (let cell = 0; cell < size * size; cell += 1) {
    if (layout.hex && !inHex(size, cell)) continue;
    const { x, y } = at[cell];
    const kind = layout.cells[cell];
    const fill = kind === CELL_BLOCKED ? "var(--blocked)" : "var(--cell)";
    if (layout.hex) node("polygon", { points: hexPoints(x, y, half / 0.866 - 0.4), fill, stroke: "var(--grid)", "stroke-width": 0.4 }, cells);
    else node("rect", { x: x - half, y: y - half, width: scale, height: scale, fill, stroke: "var(--grid)", "stroke-width": 0.4 }, cells);
    if (kind === CELL_BRIDGE) node("rect", { x: x - half * 0.55, y: y - half * 0.55, width: half * 1.1, height: half * 1.1, fill: "none", stroke: "var(--grid-strong)", "stroke-width": 0.8, rx: 1 }, cells);
  }
  // A board whose edges join says so: its rim dashed, where a line may run off one side and on at the other.
  if (layout.wrap) node("rect", { x: 0, y: 0, width: 100, height: 100, fill: "none", class: "wrap" }, cells);
  // Walls: a thick rule on the edge between two square cells.
  for (const edge of layout.walls) {
    const [a, b] = edge.split("-").map(Number);
    if (Number.isNaN(a) || Number.isNaN(b) || layout.hex) continue;
    const p = at[a];
    const q = at[b];
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    const across = Math.abs(p.y - q.y) < 0.01;
    node("line", across ? { x1: mx, y1: my - half, x2: mx, y2: my + half } : { x1: mx - half, y1: my, x2: mx + half, y2: my }, cells).setAttribute("class", "wall");
  }
  // The lines, each through its cells' middles; a step across a joined edge is drawn as a stub to each side.
  const width = scale * 0.32;
  lines.forEach((line, pair) => {
    if (line.length < 2) return;
    let path = "";
    for (let k = 0; k < line.length; k += 1) {
      const p = at[line[k]];
      const back = k > 0 ? at[line[k - 1]] : null;
      const far = back !== null && Math.hypot(p.x - back.x, p.y - back.y) > scale * 1.5;
      if (k === 0) path += `M${p.x} ${p.y}`;
      else if (far) {
        const dx = Math.sign(back.x - p.x) * half;
        const dy = Math.sign(back.y - p.y) * half;
        path += `L${back.x + dx} ${back.y + dy}M${p.x - dx} ${p.y - dy}L${p.x} ${p.y}`;
      } else path += `L${p.x} ${p.y}`;
    }
    node("path", { d: path, fill: "none", stroke: COLOURS[pair % COLOURS.length], "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" }, board);
  });
  // Waypoints, and the marbles on top.
  for (const [cell, pair] of layout.waypoints) node("circle", { cx: at[cell].x, cy: at[cell].y, r: scale * 0.2, fill: "var(--cell)", stroke: COLOURS[pair % COLOURS.length], "stroke-width": scale * 0.08 }, board);
  layout.ends.forEach((ends, pair) => {
    for (const cell of ends) node("circle", { cx: at[cell].x, cy: at[cell].y, r: scale * 0.34, fill: COLOURS[pair % COLOURS.length], stroke: "rgba(0,0,0,.25)", "stroke-width": 0.5 }, board);
  });
}

/** The cell under a pointer: the nearest cell middle on the board, within a cell of it. */
function cellAt(event) {
  const box = board.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * 100;
  const y = ((event.clientY - box.top) / box.height) * 100;
  const { scale, at } = centres();
  let best = null;
  let nearest = Infinity;
  at.forEach((p, cell) => {
    if (layout.hex && !inHex(size, cell)) return;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < nearest) {
      nearest = d;
      best = cell;
    }
  });
  return nearest <= scale * 0.75 ? best : null;
}

const done = () => allJoined(layout, lines) && answerOf(layout, lines) === answer;
const outOfStrokes = () => layout.strokes !== null && strokes >= layout.strokes && !done();

function render() {
  language.say();
  // Size buttons.
  sizes.replaceChildren(
    ...TSUNAGI_SIZES.map((each) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${each}×${each}`;
      button.setAttribute("aria-pressed", String(each === size));
      button.addEventListener("click", () => choose(each, null));
      return button;
    }),
  );
  const count = TSUNAGI_LEVEL_COUNTS[size];
  const open = openTsunagiLevels(size, solvedHere());
  document.getElementById("level-number").textContent = `${level}`;
  document.getElementById("level-of").textContent = ` / ${count}`;
  document.getElementById("previous").disabled = level <= 1;
  document.getElementById("next").disabled = level >= open;
  document.getElementById("open").textContent = say("open", open, count);
  const twists = layout === null ? [] : challengesOf(givens);
  levelLine.hidden = twists.length === 0;
  levelLine.textContent = twists.length === 0 ? "" : `${say("twist")} ${twists.map((each) => WORDS[language.lang].twists[each] ?? each).join(", ")}`;
  draw();
  if (layout === null) return;
  const cover = filled(layout, lines);
  const parts = [];
  if (done()) parts.push(say("solved"));
  else if (outOfStrokes()) parts.push(say("outOfStrokes"));
  else if (allJoined(layout, lines)) parts.push(say("joinedAll"));
  else parts.push(say("cells", cover.done, cover.of));
  if (!done() && layout.strokes !== null && !outOfStrokes()) parts.push(say("strokesLeft", layout.strokes - strokes));
  const boomIn = strokesToExplosion(layout, strokes);
  if (!done() && boomIn !== null) parts.push(say("boomIn", boomIn));
  status.textContent = parts.join(" · ");
  status.dataset.solved = String(done());
  note.textContent = said === null ? "" : say(said);
}

async function choose(nextSize, nextLevel) {
  size = nextSize;
  levels = await loadTsunagiLevels(size);
  const open = openTsunagiLevels(size, solvedHere());
  const wanted = nextLevel ?? kept.levels?.[size] ?? 1;
  level = Math.min(Math.max(1, wanted), open);
  [givens, answer] = levels[level - 1];
  layout = decodeLayout(givens, size);
  lines = noLines(layout);
  strokes = 0;
  said = null;
  kept.size = size;
  kept.levels = { ...(kept.levels ?? {}), [size]: level };
  write({ ...kept, solved });
  render();
}

board.addEventListener("pointerdown", (event) => {
  if (layout === null || done() || outOfStrokes()) return;
  const cell = cellAt(event);
  if (cell === null) return;
  const pressed = pressAt(layout, lines, cell);
  if (pressed.drawing === null) return;
  board.setPointerCapture(event.pointerId);
  before = lines;
  drawing = pressed.drawing;
  lines = pressed.lines;
  said = null;
  render();
});
board.addEventListener("pointermove", (event) => {
  if (drawing === null) return;
  const cell = cellAt(event);
  if (cell === null) return;
  const next = dragThrough(layout, lines, drawing, cell);
  if (next !== lines) {
    lines = next;
    render();
  }
});
const lift = () => {
  if (drawing === null) return;
  drawing = null;
  lines = letGo(lines, layout);
  const was = before;
  before = null;
  if (was !== null && JSON.stringify(was) !== JSON.stringify(lines)) {
    strokes += 1;
    if (done()) {
      solved = { ...solved, [size]: [...new Set([...(solved[size] ?? []), level])] };
      write({ ...kept, solved });
    } else {
      const blown = explosionAfter(layout, givens, lines, strokes);
      if (blown !== null) {
        lines = blown.lines;
        said = blown.hit.length > 1 ? "blast" : "boom";
      }
    }
  }
  render();
};
board.addEventListener("pointerup", lift);
board.addEventListener("pointercancel", lift);

document.getElementById("previous").addEventListener("click", () => choose(size, level - 1));
document.getElementById("next").addEventListener("click", () => choose(size, level + 1));
document.getElementById("reset").addEventListener("click", () => {
  if (layout === null) return;
  lines = noLines(layout);
  strokes = 0;
  said = null;
  render();
});

void choose(size, null);
