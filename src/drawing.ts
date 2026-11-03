import { TSUNAGI_BOARDS, type TsunagiBoardLook, type TsunagiBoardName } from "./boards.ts";
import { CELL_BLOCKED, CELL_BRIDGE, type LinkLayout } from "./code.ts";
import {
  beadShades,
  colourOfPair,
  lineColour,
  marbleShades,
  type TsunagiColour,
  type TsunagiColourSetName,
  type TsunagiFill,
  type TsunagiMarks,
  tsunagiColourSet,
  washColour,
} from "./colours.ts";
import {
  beadSvg,
  boardVariables,
  escapeXml,
  hashOf,
  linePiece,
  marbleSvg,
  numberType,
  pieceSvg,
  portalSvg,
  shapeRules,
  stops,
  WAYPOINT,
  withId,
} from "./drawing-pieces.ts";
import { CELL, HEX_RADIUS, hexagonPoints, round, tsunagiGeometry } from "./geometry.ts";
import { type Lines, noLines, overBridge, ownersOf } from "./lines.ts";
import { type TsunagiLanguage, tsunagiSay } from "./strings.ts";
import { TSUNAGI_STYLE } from "./style.ts";

export { attributesOf, beadSvg, escapeXml, lineSvg, numberType, pieceSvg, stops } from "./drawing-pieces.ts";

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
 *
 * @example
 * ```ts
 * import type { TsunagiDrawOptions } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const value: TsunagiDrawOptions = {marks:"numbers",coordinates:true};
 * console.log(value);
 * ```
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
  /** Draw only the playing surface, for a page with a board of its own to put it on: no frame, no paper and no coordinates, and the drawing's box is exactly the cells (with the ring of ghosts, on a board that wraps). */
  surface?: boolean;
  /** The portal whose link is showing, as a hover shows it: for a page that has something over the drawing, or a finger, which has no hover. */
  linked?: number | null;
  /** The largest a number is written, in the drawing's units (a cell is 100): for a page that would rather a small board's marble did not carry a poster. Left out, a number is sized from its marble alone. */
  largestNumber?: number;
};

/**
 * ONE GROUP OF A DRAWING: what `tsunagiDrawing` hands a page instead of one long string, so that a page keeping its
 * drawing in a framework's own tree writes only the groups whose text changed. A piece is a `<g>` with these
 * attributes, holding either its SVG text or more pieces (a pair's washes, its line and its little marbles are a piece
 * each, so a finger moving through a cell changes one or two pairs and not the thousands of elements of a 30×30 board).
 *
 * @example
 * ```ts
 * import type { TsunagiPiece } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const value: TsunagiPiece = {key:"ground",attributes:{class:"tsu-ground"},html:""};
 * console.log(value);
 * ```
 */
export type TsunagiPiece = {
  /** Stable from one drawing of a board to the next. */
  key: string;
  attributes: Readonly<Record<string, string>>;
  /** Its SVG text, unless it holds `pieces`. */
  html?: string;
  pieces?: readonly TsunagiPiece[];
};

/**
 * A whole drawing as pieces: the `<svg>`'s attributes, the custom properties its board sets, and its groups in the
 * order they are painted. `drawTsunagi` is this written out as one string, so the two cannot differ.
 *
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 * import { tsunagiDrawing } from "@johnmorrisdotca/tsunagi/draw";
 * import type { TsunagiDrawing } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const value: TsunagiDrawing = tsunagiDrawing(decodeLayout(TSUNAGI_4[0][0],4)!);
 * console.log(value.attributes.viewBox);
 * ```
 */
export type TsunagiDrawing = {
  attributes: Readonly<Record<string, string>>;
  variables: Readonly<Record<string, string>>;
  pieces: readonly TsunagiPiece[];
};

/**
 * A board as pieces, for a page that keeps its drawing in a framework's tree and writes only what changed: the same
 * drawing as `drawTsunagi`, which is this written out.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param options - Native drawing, geometry, game or mount settings.
 * @returns The `<svg>`'s attributes, the custom properties its board sets, and its groups in painting order.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 * import { tsunagiDrawing } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const layout = decodeLayout(TSUNAGI_4[0][0],4)!;
 * console.log(tsunagiDrawing(layout,{surface:true}).pieces.length);
 * ```
 */
export function tsunagiDrawing(layout: LinkLayout, options: TsunagiDrawOptions = {}): TsunagiDrawing {
  const lines = options.lines ?? noLines(layout);
  const marks = options.marks ?? "colours";
  const fill = options.fill ?? "marbles";
  const colours = tsunagiColourSet(options.colours);
  const language = options.language ?? "en";
  const surface = options.surface === true;
  const largest = options.largestNumber ?? Infinity;
  const geometry = tsunagiGeometry(layout, { coordinates: options.coordinates, ghosts: options.ghosts, surface });
  const { size, hex } = layout;
  const owners = ownersOf(layout, lines);
  const flagged = new Set(options.flagged ?? []);
  const blasted = new Set(options.blasted ?? []);
  const bridges = layout.cells.flatMap((cell, at) => (cell === CELL_BRIDGE ? [at] : []));
  const boardName =
    typeof options.board === "string" ? options.board : options.board === undefined ? "paper" : "custom";
  const { width, height, paper } = geometry;
  const pairColour = (pair: number): TsunagiColour => colourOfPair(colours, pair);
  const wash = (pair: number): string => washColour(pairColour(pair), marks);
  const stroke = (pair: number): string => lineColour(pairColour(pair), marks);
  const pieces: TsunagiPiece[] = [];
  const add = (key: string, parts: readonly string[], attributes: Record<string, string> = {}): void => {
    pieces.push({ key, attributes, html: parts.join("") });
  };

  // The gradients every marble and bead is shaded with, one of each for every pair, so that a page can redraw one pair's line without redrawing the rest.
  const pairs = layout.ends.map((_, pair) => pair);
  add("gradients", [
    `<defs><linearGradient id="__ID__-paper" x1="0" y1="0" x2="0" y2="1"><stop class="tsu-paper-stop-a" offset="0"/><stop class="tsu-paper-stop-b" offset="1"/></linearGradient>${pairs
      .map(
        (pair) =>
          `<radialGradient id="__ID__-m${pair}" cx=".35" cy=".3" r=".955">${stops(marbleShades(pairColour(pair), marks))}</radialGradient>`,
      )
      .join("")}${pairs
      .map(
        (pair) =>
          `<radialGradient id="__ID__-b${pair}" cx=".35" cy=".3" r=".955">${stops(beadShades(pairColour(pair), marks))}</radialGradient>`,
      )
      .join("")}</defs>`,
  ]);

  // The paper and its frame: a page with a board of its own draws these itself.
  const ground: string[] = [];
  if (!surface) {
    ground.push(`<rect class="tsu-frame" width="${round(width)}" height="${round(height)}" rx="22"/>`);
    ground.push(
      `<rect class="tsu-paper" x="${paper.x}" y="${paper.y}" width="${round(paper.width)}" height="${round(paper.height)}" rx="6" fill="url(#__ID__-paper)"/>`,
    );
  }
  if (options.done === true)
    ground.push(
      `<rect class="tsu-solved" x="${paper.x}" y="${paper.y}" width="${round(paper.width)}" height="${round(paper.height)}" rx="6"/>`,
    );

  // Row numbers and column letters, on the frame.
  if (geometry.coordinates) {
    const room = (paper.x - 0) / 2;
    for (let at = 0; at < geometry.cols; at += 1) {
      const middle = geometry.centre(at + geometry.first.col);
      const letter = String.fromCharCode(65 + (at % 26));
      ground.push(
        `<text class="tsu-coordinate" x="${round(middle.x)}" y="${round(room)}" dy=".35em" aria-hidden="true">${letter}</text>`,
      );
    }
    for (let at = 0; at < geometry.rows; at += 1) {
      const row = geometry.centre((at + geometry.first.row) * size);
      ground.push(
        `<text class="tsu-coordinate" x="${round(room)}" y="${round(row.y)}" dy=".35em" aria-hidden="true">${at + 1}</text>`,
      );
    }
  }
  add("ground", ground);

  // The cells: a wash where a line runs (in a group of its pair's, so a page can redraw one pair's), a dark square where blocked, a hexagon's outline.
  const washed: string[][] = layout.ends.map(() => []);
  const blocked: string[] = [];
  const hexes: string[] = [];
  layout.cells.forEach((cell, at) => {
    if (!geometry.onBoard(at)) return;
    const { x, y } = geometry.centre(at);
    const owner = owners[at]!;
    const shows = owner >= 0 && cell < 0;
    if (hex) {
      const points = hexagonPoints(x, y, HEX_RADIUS * CELL);
      if (shows) washed[owner]!.push(`<polygon points="${points}" fill="${wash(owner)}"/>`);
      if (cell === CELL_BLOCKED)
        blocked.push(`<polygon class="tsu-blocked" points="${hexagonPoints(x, y, HEX_RADIUS * CELL - 6)}"/>`);
      hexes.push(`<polygon class="tsu-hex-cell" points="${points}"/>`);
      return;
    }
    if (shows)
      washed[owner]!.push(
        `<rect x="${round(x - CELL / 2)}" y="${round(y - CELL / 2)}" width="${CELL}" height="${CELL}" fill="${wash(owner)}"/>`,
      );
    else if (cell === CELL_BLOCKED)
      blocked.push(
        `<rect class="tsu-blocked" x="${round(x - 42)}" y="${round(y - 42)}" width="84" height="84" rx="8"/>`,
      );
  });
  pieces.push({
    key: "washes",
    attributes: { class: "tsu-washes" },
    pieces: washed.map((each, pair) => ({
      key: `washes-${pair}`,
      attributes: { "data-pair": String(pair) },
      html: each.join(""),
    })),
  });
  if (hex) add("hexes", hexes, { class: "tsu-hexes" });

  const rules: string[] = [...blocked];
  if (!hex) {
    if (layout.off !== undefined && layout.off.size > 0) rules.push(...shapeRules(layout, geometry));
    else {
      const left = geometry.centre(0).x - CELL / 2;
      const top = geometry.centre(0).y - CELL / 2;
      const across = size * CELL;
      let grid = "";
      for (let at = 1; at < size; at += 1)
        grid += `M${round(left + at * CELL)} ${round(top)}v${across}M${round(left)} ${round(top + at * CELL)}h${across}`;
      rules.push(`<path class="tsu-grid" d="${grid}"/>`);
      rules.push(
        `<rect class="${layout.wrap ? "tsu-rim" : "tsu-border"}" x="${round(left)}" y="${round(top)}" width="${across}" height="${across}"/>`,
      );
    }
    // Walls: a thick bar on the edge between two square cells.
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
      rules.push(
        dx !== 0
          ? `<line class="tsu-wall" data-edge="${wall}" x1="${round(mx)}" y1="${round(my - CELL / 2)}" x2="${round(mx)}" y2="${round(my + CELL / 2)}"/>`
          : `<line class="tsu-wall" data-edge="${wall}" x1="${round(mx - CELL / 2)}" y1="${round(my)}" x2="${round(mx + CELL / 2)}" y2="${round(my)}"/>`,
      );
    }
  }
  add("rules", rules);

  // The lines, with every bridge's deck cut out of them: the line going down passes UNDER the bridge and is lost beneath it.
  const linePieces = lines.flatMap((line, pair) =>
    line.length < 2 ? [] : [linePiece(layout, geometry, line, pair, stroke(pair))],
  );
  if (bridges.length > 0) {
    const holes = bridges
      .map((at) => {
        const { x, y } = geometry.centre(at);
        return `<rect x="${round(x - 40)}" y="${round(y - 40)}" width="80" height="80" rx="14" fill="black"/>`;
      })
      .join("");
    add("under", [
      `<defs><mask id="__ID__-under" maskUnits="userSpaceOnUse" x="-100" y="-100" width="${round(width + 200)}" height="${round(height + 200)}"><rect x="-100" y="-100" width="${round(width + 200)}" height="${round(height + 200)}" fill="white"/>${holes}</mask></defs>`,
    ]);
    pieces.push({
      key: "lines",
      attributes: { class: "tsu-lines", mask: "url(#__ID__-under)" },
      pieces: linePieces,
    });
  } else pieces.push({ key: "lines", attributes: { class: "tsu-lines" }, pieces: linePieces });

  // Then each bridge on top of the line beneath it: its deck and two rails, and the line going across drawn over the deck.
  const decks: string[] = [];
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
    decks.push(
      `<g class="tsu-bridge" data-cell="${at}"${across >= 0 ? ` data-across="${across}"` : ""}><rect class="tsu-deck" x="${round(x - 40)}" y="${round(y - 40)}" width="80" height="80" rx="14"/>${[-34, 34].map((edge) => `<line class="tsu-rail" x1="${round(x - 40)}" y1="${round(y + edge)}" x2="${round(x + 40)}" y2="${round(y + edge)}"/>`).join("")}${over}</g>`,
    );
  }
  if (decks.length > 0) add("bridges", decks);

  // Waypoints, then the little marbles along each line, then the marbles at its ends.
  const waypoints: string[] = [];
  for (const [at, pair] of layout.waypoints) {
    if (!geometry.onBoard(at)) continue;
    const { x, y } = geometry.centre(at);
    const number =
      marks === "numbers" && owners[at]! < 0
        ? `<text class="tsu-num" x="${round(x)}" y="${round(y)}" dy=".35em" fill="${stroke(pair)}" ${numberType(pair + 1, WAYPOINT * 1.8, largest)}>${pair + 1}</text>`
        : "";
    waypoints.push(
      `<g class="tsu-waypoint" data-pair="${pair}" data-cell="${at}"><circle cx="${round(x)}" cy="${round(y)}" r="${WAYPOINT}" fill="none" stroke="${stroke(pair)}" stroke-width="6"/>${number}</g>`,
    );
  }
  add("waypoints", waypoints);

  // The little marbles along each line, in a group of each pair's.
  const beads: string[][] = layout.ends.map(() => []);
  if (fill === "marbles") {
    layout.cells.forEach((cell, at) => {
      // A portal cell is a ring, not a place a line rests: no bead on it.
      if (!geometry.onBoard(at) || cell >= 0 || owners[at]! < 0 || layout.portals.has(at)) return;
      beads[owners[at]!]!.push(beadSvg(geometry, at, owners[at]!));
    });
  }
  pieces.push({
    key: "beads",
    attributes: { class: "tsu-beads" },
    pieces: beads.map((each, pair) => ({
      key: `beads-${pair}`,
      attributes: { "data-pair": String(pair) },
      html: each.join(""),
    })),
  });

  // Portals: two rings alike, with a faint link between them that shows where the pointer is over one.
  add(
    "portals",
    layout.portalPairs.map(([a, b], index) => portalSvg(geometry, a, b, index, language, options.linked === index)),
  );

  const marbles: string[] = [];
  layout.ends.forEach((ends, pair) => {
    for (const at of ends)
      marbles.push(marbleSvg(layout, geometry, at, pair, marks, colours, language, flagged.has(pair), false, largest));
  });
  add("marbles", marbles);

  const blasts: string[] = [];
  for (const at of blasted) {
    if (!geometry.onBoard(at)) continue;
    const { x, y } = geometry.centre(at);
    blasts.push(`<circle class="tsu-blast" data-cell="${at}" cx="${round(x)}" cy="${round(y)}" r="40"/>`);
  }
  add("blasts", blasts);

  // The far edge's ghosts, all round a board that wraps: what is there, faded, in the ring outside the real board.
  if (geometry.ring > 0) {
    const ghosts: string[] = [];
    const ghostBeads: string[][] = layout.ends.map(() => []);
    const span = size + 2 * geometry.ring;
    for (let down = 0; down < span; down += 1) {
      for (let across = 0; across < span; across += 1) {
        if (across >= 1 && across <= size && down >= 1 && down <= size) continue;
        const at = ((down - 1 + size) % size) * size + ((across - 1 + size) % size);
        const middle = { x: paper.x + (across + 0.5) * CELL, y: paper.y + (down + 0.5) * CELL };
        const cell = layout.cells[at]!;
        const place = { ...geometry, centre: () => middle };
        if (cell >= 0) ghosts.push(marbleSvg(layout, place, at, cell, marks, colours, language, false, true, largest));
        else if (fill === "marbles" && owners[at]! >= 0) ghostBeads[owners[at]!]!.push(beadSvg(place, at, owners[at]!));
      }
    }
    pieces.push({
      key: "ghosts",
      attributes: { class: "tsu-ghosts", "aria-hidden": "true" },
      pieces: [
        { key: "ghost-marbles", attributes: {}, html: ghosts.join("") },
        ...ghostBeads.map((each, pair) => ({
          key: `ghosts-${pair}`,
          attributes: { "data-pair": String(pair) },
          html: each.join(""),
        })),
      ],
    });
  }

  const shaped = layout.off !== undefined && layout.off.size > 0;
  const label =
    options.label ??
    tsunagiSay(language, `${hex ? "boardHex" : "board"}${shaped ? "Shape" : ""}`, {
      size,
      cols: geometry.cols,
      rows: geometry.rows,
    });
  const solved = options.done === true;
  // The ids are made from the drawing as it is, or given, and only then written in.
  const id =
    options.id ?? `tsu${hashOf((options.style === true ? TSUNAGI_STYLE : "") + pieces.map(pieceSvg).join(""))}`;
  const attributes: Record<string, string> = {
    xmlns: "http://www.w3.org/2000/svg",
    class: "tsunagi",
    viewBox: `0 0 ${round(width)} ${round(height)}`,
    role: "group",
    "aria-label": escapeXml(label),
    "data-size": String(size),
    "data-marks": marks,
    "data-fill": fill,
    "data-board": boardName,
    "data-solved": String(solved),
  };
  if (layout.wrap) attributes["data-wrap"] = "true";
  if (hex) attributes["data-hex"] = "true";
  if (surface) attributes["data-surface"] = "true";
  const variables =
    boardName === "paper"
      ? {}
      : boardVariables(
          boardName === "custom" ? (options.board as TsunagiBoardLook) : TSUNAGI_BOARDS[boardName as TsunagiBoardName],
        );
  return { attributes, variables, pieces: pieces.map((piece) => withId(piece, id)) };
}
