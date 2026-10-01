import { TSUNAGI_BOARDS, type TsunagiBoardLook, type TsunagiBoardName } from "./boards.ts";
import { colourOfPair, beadShades, lineColour, marbleShades, tsunagiColourSet, washColour, type TsunagiColour, type TsunagiColourSetName, type TsunagiFill, type TsunagiMarks } from "./colours.ts";
import { CELL_BLOCKED, CELL_BRIDGE, decodeLayout, type LinkLayout } from "./code.ts";
import { CELL, hexagonPoints, HEX_RADIUS, lineRuns, round, tsunagiGeometry, type TsunagiGeometry } from "./geometry.ts";
import { noLines, overBridge, ownersOf, type Lines } from "./lines.ts";
import { tsunagiSay, type TsunagiLanguage } from "./strings.ts";
import { TSUNAGI_STYLE } from "./style.ts";

/**
 * DRAWING a board as SVG text: a string, to put in a page, a file or an image,
 * with nothing to load and nothing run. Every picture here is made in code.
 *
 * What is drawn is what the site that grew this package draws: marbles on a
 * board, the lines between them as thick rounded strokes through the cells'
 * middles, every cell a line runs through washed faintly in its colour and (as
 * `fill: "marbles"`) holding a small marble of that colour too, so a finished
 * board is a board of marbles joined by their lines. Walls are thick bars on
 * the edge between two cells. A BRIDGE is drawn as a bridge: the line going
 * down passes UNDER its deck and is lost beneath it, and the line going across
 * is drawn over the deck. A waypoint is a ring in its line's colour. A board
 * that wraps has a ghost of the far edge all round it, faded, with a dashed rim
 * round the real board, and a line across the join is drawn out through one
 * edge and in through the other. A hexagon is a honeycomb of hexagons.
 *
 * The drawing holds still: the same board is the same box whatever is drawn on
 * it, and a page redraws it as lines change. Colours and numbers on the
 * marbles, dots or only lines, a colour set and a board are all options.
 */

export type TsunagiDrawOptions = {
  /** The lines drawn so far, one list of cells for each pair (`Lines`); none, if left out. */
  lines?: Lines;
  /** Tell the pairs apart by colour (the default) or by the number on their marbles. */
  marks?: TsunagiMarks;
  /** A small marble in every cell a line runs through (`marbles`, the default: the dots), or the line alone (`lines`). */
  fill?: TsunagiFill;
  /** The colour of each pair: a named set (`marble`, `bright`, `colour-blind`, `soft`) or colours of your own. */
  colours?: TsunagiColourSetName | readonly TsunagiColour[];
  /** The board it is drawn on: `paper` (the default, which follows the page's light or dark), `wood`, `green`, `blue`, `red`, `black`, or a look of your own. */
  board?: TsunagiBoardName | TsunagiBoardLook;
  /** Row numbers and column letters down the board's sides. Not drawn on a board that wraps or a hexagon. */
  coordinates?: boolean;
  /** The ghost of the far edge round a board that wraps. Default true. */
  ghosts?: boolean;
  /** Pairs whose marbles flash: the ones Check found not joined yet. */
  flagged?: Iterable<number>;
  /** Cells an explosion has just taken a line out of: each bursts. */
  blasted?: Iterable<number>;
  /** The board is solved: a faint wash of green over it, and `data-solved="true"`. */
  done?: boolean;
  /** The language a screen reader hears the drawing in: `en` (the default) or `ja`. */
  language?: TsunagiLanguage;
  /** A description for screen readers, instead of the board's size. */
  label?: string;
  /** Put `TSUNAGI_STYLE` inside the drawing, so it stands alone as an image. A page with the style in already leaves this off. */
  style?: boolean;
  /** The prefix of the ids the drawing's gradients and mask are given, so two drawings on one page never share one. Made from the drawing itself, if left out. */
  id?: string;
};

const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** FNV-1a, as a short base-36 string: the same drawing always gets the same ids. */
function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at += 1) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

const MARBLE = 37;
const BEAD = 28;
const WAYPOINT = 29;
const NUMBER_TO_MARBLE = [0.6, 0.52, 0.4] as const;

/** A number's font size in the drawing's units, by how many digits it has, and the spacing that keeps two digits inside the marble. */
function numberType(value: number, across: number): string {
  const digits = String(value).length;
  const size = round(across * NUMBER_TO_MARBLE[Math.min(digits, NUMBER_TO_MARBLE.length) - 1]!);
  return digits === 1 ? `font-size="${size}"` : `font-size="${size}" letter-spacing="-0.04em"`;
}

function stops(shades: { light: string; body: string; rim: string }): string {
  return `<stop offset="0" stop-color="${shades.light}"/><stop offset=".45" stop-color="${shades.body}"/><stop offset="1" stop-color="${shades.rim}"/>`;
}

/** The custom properties a board other than the plain paper sets on the drawing. */
function boardStyle(look: TsunagiBoardLook): string {
  const [paper, deep] = typeof look.paper === "string" ? [look.paper, look.paper] : look.paper;
  return `--tsu-paper:${paper};--tsu-paper-deep:${deep};--tsu-frame:${look.frame};--tsu-grid:${look.grid};--tsu-ink:${look.ink};--tsu-coordinate:${look.coordinate}`;
}

/** The marbles on a board, each with its pair's number where the marks are numbers. */
function marbleSvg(layout: LinkLayout, geometry: TsunagiGeometry, cell: number, pair: number, marks: TsunagiMarks, colours: readonly TsunagiColour[], language: TsunagiLanguage, flagged: boolean, ghost = false): string {
  const { x, y } = geometry.centre(cell);
  const shades = marbleShades(colourOfPair(colours, pair), marks);
  const shadow = `<circle cx="${round(x)}" cy="${round(y + 2.5)}" r="${MARBLE}" fill="#000" opacity=".32"/>`;
  const ball = `<circle cx="${round(x)}" cy="${round(y)}" r="${MARBLE}" fill="url(#__ID__-m${pair})"/>`;
  const number = marks === "numbers" ? `<text class="tsu-num" x="${round(x)}" y="${round(y)}" dy=".35em" fill="${shades.ink}" ${numberType(pair + 1, MARBLE * 2)}>${pair + 1}</text>` : "";
  if (ghost) return `<g>${shadow}${ball}${number}</g>`;
  const label = tsunagiSay(language, "marble", { n: pair + 1, row: Math.floor(cell / layout.size) + 1, col: (cell % layout.size) + 1 });
  const flag = flagged ? `<circle class="tsu-flag" data-pair="${pair}" cx="${round(x)}" cy="${round(y)}" r="${MARBLE + 4}" stroke="${lineColour(colourOfPair(colours, pair), marks)}"/>` : "";
  return `<g class="tsu-marble" data-pair="${pair}" data-cell="${cell}" role="img" aria-label="${escape(label)}">${flag}${shadow}${ball}${number}</g>`;
}

function beadSvg(geometry: TsunagiGeometry, cell: number, pair: number): string {
  const { x, y } = geometry.centre(cell);
  return `<g class="tsu-bead" data-pair="${pair}" data-cell="${cell}"><circle cx="${round(x)}" cy="${round(y + 2)}" r="${BEAD}" fill="#000" opacity=".3"/><circle cx="${round(x)}" cy="${round(y)}" r="${BEAD}" fill="url(#__ID__-b${pair})"/></g>`;
}

/**
 * A board as SVG text, with the lines in `options.lines` drawn on it. The
 * drawing is `class="tsunagi"`; its colours and its two movements are
 * `TSUNAGI_STYLE`. Its parts carry classes and data attributes a page can style
 * or find: `tsu-marble`, `tsu-bead`, `tsu-line` (`data-pair`, `data-cells`),
 * `tsu-bridge` (`data-cell`, `data-across`), `tsu-over-bridge`, `tsu-wall`
 * (`data-edge`), `tsu-waypoint`, `tsu-flag`, `tsu-blast`, `tsu-hex-cell`.
 */
export function drawTsunagi(layout: LinkLayout, options: TsunagiDrawOptions = {}): string {
  const lines = options.lines ?? noLines(layout);
  const marks = options.marks ?? "colours";
  const fill = options.fill ?? "marbles";
  const colours = tsunagiColourSet(options.colours);
  const language = options.language ?? "en";
  const geometry = tsunagiGeometry(layout, { coordinates: options.coordinates, ghosts: options.ghosts });
  const { size, hex } = layout;
  const owners = ownersOf(layout, lines);
  const flagged = new Set(options.flagged ?? []);
  const blasted = new Set(options.blasted ?? []);
  const bridges = layout.cells.flatMap((cell, at) => (cell === CELL_BRIDGE ? [at] : []));
  const boardName = typeof options.board === "string" ? options.board : options.board === undefined ? "paper" : "custom";
  const { side, paper } = geometry;
  const pairColour = (pair: number): TsunagiColour => colourOfPair(colours, pair);
  const wash = (pair: number): string => washColour(pairColour(pair), marks);
  const stroke = (pair: number): string => lineColour(pairColour(pair), marks);
  const parts: string[] = [];

  // The paper and its frame.
  parts.push(`<rect class="tsu-frame" width="${round(side)}" height="${round(side)}" rx="22"/>`);
  parts.push(`<rect class="tsu-paper" x="${paper.x}" y="${paper.y}" width="${round(paper.width)}" height="${round(paper.height)}" rx="6" fill="url(#__ID__-paper)"/>`);
  if (options.done === true) parts.push(`<rect class="tsu-solved" x="${paper.x}" y="${paper.y}" width="${round(paper.width)}" height="${round(paper.height)}" rx="6"/>`);

  // Row numbers and column letters, on the frame.
  if (geometry.coordinates) {
    const room = (paper.x - 0) / 2;
    for (let at = 0; at < size; at += 1) {
      const middle = geometry.centre(at);
      const letter = String.fromCharCode(65 + (at % 26));
      parts.push(`<text class="tsu-coordinate" x="${round(middle.x)}" y="${round(room)}" dy=".35em" aria-hidden="true">${letter}</text>`);
      const row = geometry.centre(at * size);
      parts.push(`<text class="tsu-coordinate" x="${round(room)}" y="${round(row.y)}" dy=".35em" aria-hidden="true">${at + 1}</text>`);
    }
  }

  // The cells: a wash where a line runs, a dark square where blocked, a hexagon's outline.
  const washed: string[] = [];
  const blocked: string[] = [];
  const hexes: string[] = [];
  layout.cells.forEach((cell, at) => {
    if (!geometry.onBoard(at)) return;
    const { x, y } = geometry.centre(at);
    const owner = owners[at]!;
    const shows = owner >= 0 && cell < 0;
    if (hex) {
      const points = hexagonPoints(x, y, HEX_RADIUS * CELL);
      if (shows) washed.push(`<polygon points="${points}" fill="${wash(owner)}"/>`);
      if (cell === CELL_BLOCKED) blocked.push(`<polygon class="tsu-blocked" points="${hexagonPoints(x, y, HEX_RADIUS * CELL - 6)}"/>`);
      hexes.push(`<polygon class="tsu-hex-cell" points="${points}"/>`);
      return;
    }
    if (shows) washed.push(`<rect x="${round(x - CELL / 2)}" y="${round(y - CELL / 2)}" width="${CELL}" height="${CELL}" fill="${wash(owner)}"/>`);
    else if (cell === CELL_BLOCKED) blocked.push(`<rect class="tsu-blocked" x="${round(x - 42)}" y="${round(y - 42)}" width="84" height="84" rx="8"/>`);
  });
  parts.push(`<g class="tsu-washes">${washed.join("")}</g>`);
  if (hex) parts.push(`<g class="tsu-hexes">${hexes.join("")}</g>`);
  parts.push(...blocked);
  if (!hex) {
    const left = geometry.centre(0).x - CELL / 2;
    const top = geometry.centre(0).y - CELL / 2;
    const across = size * CELL;
    let rules = "";
    for (let at = 1; at < size; at += 1) rules += `M${round(left + at * CELL)} ${round(top)}v${across}M${round(left)} ${round(top + at * CELL)}h${across}`;
    parts.push(`<path class="tsu-grid" d="${rules}"/>`);
    parts.push(`<rect class="${layout.wrap ? "tsu-rim" : "tsu-border"}" x="${round(left)}" y="${round(top)}" width="${across}" height="${across}"/>`);
  }

  // Walls: a thick bar on the edge between two square cells.
  if (!hex) {
    for (const wall of layout.walls) {
      const [a, b] = wall.split("-").map(Number) as [number, number];
      const from = geometry.centre(a);
      const to = geometry.centre(b);
      // Neighbours across a join of a board that wraps sit a board apart: the bar is drawn at the edge of the first, facing the second.
      const far = Math.abs(from.x - to.x) > CELL * 1.5 || Math.abs(from.y - to.y) > CELL * 1.5;
      const dx = far ? Math.sign(from.x - to.x) : Math.sign(to.x - from.x);
      const dy = far ? Math.sign(from.y - to.y) : Math.sign(to.y - from.y);
      const mx = from.x + dx * (CELL / 2);
      const my = from.y + dy * (CELL / 2);
      parts.push(
        dx !== 0
          ? `<line class="tsu-wall" data-edge="${wall}" x1="${round(mx)}" y1="${round(my - CELL / 2)}" x2="${round(mx)}" y2="${round(my + CELL / 2)}"/>`
          : `<line class="tsu-wall" data-edge="${wall}" x1="${round(mx - CELL / 2)}" y1="${round(my)}" x2="${round(mx + CELL / 2)}" y2="${round(my)}"/>`,
      );
    }
  }

  // The lines, with every bridge's deck cut out of them: the line going down passes UNDER the bridge and is lost beneath it.
  const lineParts = lines.map((line, pair) => {
    if (line.length < 2) return "";
    const runs = lineRuns(layout, geometry, line)
      .map((run) => `<polyline points="${run.map((point) => `${round(point.x)},${round(point.y)}`).join(" ")}" stroke="${stroke(pair)}"/>`)
      .join("");
    return `<g class="tsu-line" data-pair="${pair}" data-cells="${line.length}">${runs}</g>`;
  });
  if (bridges.length > 0) {
    const holes = bridges
      .map((at) => {
        const { x, y } = geometry.centre(at);
        return `<rect x="${round(x - 40)}" y="${round(y - 40)}" width="80" height="80" rx="14" fill="black"/>`;
      })
      .join("");
    parts.push(`<defs><mask id="__ID__-under" maskUnits="userSpaceOnUse" x="-100" y="-100" width="${round(side + 200)}" height="${round(side + 200)}"><rect x="-100" y="-100" width="${round(side + 200)}" height="${round(side + 200)}" fill="white"/>${holes}</mask></defs>`);
    parts.push(`<g class="tsu-lines" mask="url(#__ID__-under)">${lineParts.join("")}</g>`);
  } else parts.push(`<g class="tsu-lines">${lineParts.join("")}</g>`);

  // Then each bridge on top of the line beneath it: its deck and two rails, and the line going across drawn over the deck.
  for (const at of bridges) {
    const { x, y } = geometry.centre(at);
    const across = overBridge(lines, at).across;
    const line = across < 0 ? null : lines[across]!;
    const on = line === null ? -1 : line.indexOf(at);
    const ends = line === null ? [] : [line[on - 1], line[on + 1]].filter((cell): cell is number => cell !== undefined);
    const over =
      ends.length === 0
        ? ""
        : // From the edge it came in by, through the middle, out by the edge beyond: the part of the line the deck cut out.
          `<polyline class="tsu-over-bridge" data-pair="${across}" points="${[ends[0]!, at, ...ends.slice(1)].map((cell) => (cell === at ? `${round(x)},${round(y)}` : `${round(x + Math.sign(geometry.centre(cell).x - x) * (CELL / 2))},${round(y)}`)).join(" ")}" stroke="${stroke(across)}"/>`;
    parts.push(
      `<g class="tsu-bridge" data-cell="${at}"${across >= 0 ? ` data-across="${across}"` : ""}><rect class="tsu-deck" x="${round(x - 40)}" y="${round(y - 40)}" width="80" height="80" rx="14"/>${[-34, 34].map((edge) => `<line class="tsu-rail" x1="${round(x - 40)}" y1="${round(y + edge)}" x2="${round(x + 40)}" y2="${round(y + edge)}"/>`).join("")}${over}</g>`,
    );
  }

  // Waypoints, then the little marbles along each line, then the marbles at its ends.
  for (const [at, pair] of layout.waypoints) {
    if (!geometry.onBoard(at)) continue;
    const { x, y } = geometry.centre(at);
    const number = marks === "numbers" && owners[at]! < 0 ? `<text class="tsu-num" x="${round(x)}" y="${round(y)}" dy=".35em" fill="${stroke(pair)}" ${numberType(pair + 1, WAYPOINT * 1.8)}>${pair + 1}</text>` : "";
    parts.push(`<g class="tsu-waypoint" data-pair="${pair}" data-cell="${at}"><circle cx="${round(x)}" cy="${round(y)}" r="${WAYPOINT}" fill="none" stroke="${stroke(pair)}" stroke-width="6"/>${number}</g>`);
  }
  const beadPairs = new Set<number>();
  if (fill === "marbles") {
    layout.cells.forEach((cell, at) => {
      if (!geometry.onBoard(at) || cell >= 0 || owners[at]! < 0) return;
      beadPairs.add(owners[at]!);
      parts.push(beadSvg(geometry, at, owners[at]!));
    });
  }
  layout.ends.forEach((ends, pair) => {
    for (const at of ends) parts.push(marbleSvg(layout, geometry, at, pair, marks, colours, language, flagged.has(pair)));
  });
  for (const at of blasted) {
    if (!geometry.onBoard(at)) continue;
    const { x, y } = geometry.centre(at);
    parts.push(`<circle class="tsu-blast" data-cell="${at}" cx="${round(x)}" cy="${round(y)}" r="40"/>`);
  }

  // The far edge's ghosts, all round a board that wraps: what is there, faded, in the ring outside the real board.
  if (geometry.ring > 0) {
    const ghosts: string[] = [];
    const span = size + 2 * geometry.ring;
    for (let down = 0; down < span; down += 1) {
      for (let across = 0; across < span; across += 1) {
        if (across >= 1 && across <= size && down >= 1 && down <= size) continue;
        const at = ((down - 1 + size) % size) * size + ((across - 1 + size) % size);
        const middle = { x: paper.x + (across + 0.5) * CELL, y: paper.y + (down + 0.5) * CELL };
        const cell = layout.cells[at]!;
        const place = { ...geometry, centre: () => middle };
        if (cell >= 0) ghosts.push(marbleSvg(layout, place, at, cell, marks, colours, language, false, true));
        else if (fill === "marbles" && owners[at]! >= 0) ghosts.push(beadSvg(place, at, owners[at]!));
      }
    }
    parts.push(`<g class="tsu-ghosts" aria-hidden="true">${ghosts.join("")}</g>`);
  }

  // The gradients every marble is shaded with, one for each pair that has any.
  const pairs = layout.ends.map((_, pair) => pair);
  const defs = `<defs><linearGradient id="__ID__-paper" x1="0" y1="0" x2="0" y2="1"><stop class="tsu-paper-stop-a" offset="0"/><stop class="tsu-paper-stop-b" offset="1"/></linearGradient>${pairs
    .map((pair) => `<radialGradient id="__ID__-m${pair}" cx=".35" cy=".3" r=".955">${stops(marbleShades(pairColour(pair), marks))}</radialGradient>`)
    .join("")}${[...beadPairs]
    .map((pair) => `<radialGradient id="__ID__-b${pair}" cx=".35" cy=".3" r=".955">${stops(beadShades(pairColour(pair), marks))}</radialGradient>`)
    .join("")}</defs>`;

  const label = options.label ?? tsunagiSay(language, hex ? "boardHex" : "board", { size });
  const solved = options.done === true;
  const body = `${options.style === true ? `<style>${TSUNAGI_STYLE}</style>` : ""}${defs}${parts.join("")}`;
  const id = options.id ?? `tsu${hashOf(body)}`;
  const flags = [layout.wrap ? ' data-wrap="true"' : "", hex ? ' data-hex="true"' : "", boardName === "paper" ? "" : ` style="${boardStyle(boardName === "custom" ? (options.board as TsunagiBoardLook) : TSUNAGI_BOARDS[boardName as TsunagiBoardName])}"`].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" class="tsunagi" viewBox="0 0 ${round(side)} ${round(side)}" role="group" aria-label="${escape(label)}" data-size="${size}" data-marks="${marks}" data-fill="${fill}" data-board="${boardName}" data-solved="${solved}"${flags}>${body.replaceAll("__ID__", id)}</svg>`;
}

/** A level's layout code drawn, or an empty string for a code that is no layout at that size. */
export function drawTsunagiCode(givens: string, size: number, options: TsunagiDrawOptions = {}): string {
  const layout = decodeLayout(givens, size);
  return layout === null ? "" : drawTsunagi(layout, options);
}

/** One marble on its own, as SVG text: for a legend or an icon. `pair` is which of the board's pairs it is, from 0. */
export function drawTsunagiMarble(pair: number, options: { marks?: TsunagiMarks; colours?: TsunagiColourSetName | readonly TsunagiColour[]; label?: string; style?: boolean; id?: string } = {}): string {
  const marks = options.marks ?? "colours";
  const colours = tsunagiColourSet(options.colours);
  const shades = marbleShades(colourOfPair(colours, pair), marks);
  const id = options.id ?? `tsum${pair}${marks}`;
  const number = marks === "numbers" ? `<text class="tsu-num" x="50" y="50" dy=".35em" fill="${shades.ink}" ${numberType(pair + 1, 74)}>${pair + 1}</text>` : "";
  const label = options.label ?? `marble ${pair + 1}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="tsunagi" viewBox="0 0 100 100" role="img" aria-label="${escape(label)}">${options.style === true ? `<style>${TSUNAGI_STYLE}</style>` : ""}<defs><radialGradient id="${id}" cx=".35" cy=".3" r=".955">${stops(shades)}</radialGradient></defs><circle cx="50" cy="53" r="37" fill="#000" opacity=".32"/><circle cx="50" cy="50" r="37" fill="url(#${id})"/>${number}</svg>`;
}
