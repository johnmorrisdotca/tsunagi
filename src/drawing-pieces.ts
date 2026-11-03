import type { TsunagiBoardLook } from "./boards.ts";
import type { LinkLayout } from "./code.ts";
import {
  colourOfPair,
  hsl,
  lineColour,
  marbleShades,
  portalMark,
  TSUNAGI_PORTAL_COLOURS,
  type TsunagiColour,
  type TsunagiMarks,
} from "./colours.ts";
import type { TsunagiPiece } from "./drawing.ts";
import { CELL, lineRuns, round, type TsunagiGeometry, type TsunagiPoint } from "./geometry.ts";
import { type TsunagiLanguage, tsunagiSay } from "./strings.ts";

/** A record of attributes as they are written in a tag. */
export function attributesOf(attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");
}

/** A piece as SVG text. */
export function pieceSvg(piece: TsunagiPiece): string {
  const inside = piece.pieces === undefined ? (piece.html ?? "") : piece.pieces.map(pieceSvg).join("");
  const attributes = attributesOf(piece.attributes);
  return `<g${attributes === "" ? "" : ` ${attributes}`}>${inside}</g>`;
}

/** Every place an id is waiting for the drawing's own. */
export function withId(piece: TsunagiPiece, id: string): TsunagiPiece {
  const attributes = Object.fromEntries(
    Object.entries(piece.attributes).map(([name, value]) => [name, value.replaceAll("__ID__", id)]),
  );
  if (piece.pieces !== undefined) return { ...piece, attributes, pieces: piece.pieces.map((each) => withId(each, id)) };
  return { ...piece, attributes, html: (piece.html ?? "").replaceAll("__ID__", id) };
}

export const escapeXml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** FNV-1a, as a short base-36 string: the same drawing always gets the same ids. */
export function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at += 1) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

const MARBLE = 37;
const BEAD = 28;
export const WAYPOINT = 29;
const NUMBER_TO_MARBLE = [0.6, 0.52, 0.4] as const;

/** A number's font size in the drawing's units, by how many digits it has, and the spacing that keeps two digits inside the marble. */
export function numberType(value: number, across: number, largest = Infinity): string {
  const digits = String(value).length;
  const size = round(Math.min(largest, across * NUMBER_TO_MARBLE[Math.min(digits, NUMBER_TO_MARBLE.length) - 1]!));
  return digits === 1 ? `font-size="${size}"` : `font-size="${size}" letter-spacing="-0.04em"`;
}

export function stops(shades: { light: string; body: string; rim: string }): string {
  return `<stop offset="0" stop-color="${shades.light}"/><stop offset=".45" stop-color="${shades.body}"/><stop offset="1" stop-color="${shades.rim}"/>`;
}

/** The custom properties a board other than the plain paper sets on the drawing. */
export function boardVariables(look: TsunagiBoardLook): Record<string, string> {
  const [paper, deep] = typeof look.paper === "string" ? [look.paper, look.paper] : look.paper;
  return {
    "--tsu-paper": String(paper),
    "--tsu-paper-deep": String(deep),
    "--tsu-frame": look.frame,
    "--tsu-grid": look.grid,
    "--tsu-ink": look.ink,
    "--tsu-coordinate": look.coordinate,
  };
}

/** The marbles on a board, each with its pair's number where the marks are numbers. */
export function marbleSvg(
  layout: LinkLayout,
  geometry: TsunagiGeometry,
  cell: number,
  pair: number,
  marks: TsunagiMarks,
  colours: readonly TsunagiColour[],
  language: TsunagiLanguage,
  flagged: boolean,
  ghost = false,
  largest = Infinity,
): string {
  const { x, y } = geometry.centre(cell);
  const shades = marbleShades(colourOfPair(colours, pair), marks);
  const shadow = `<circle cx="${round(x)}" cy="${round(y + 2.5)}" r="${MARBLE}" fill="#000" opacity=".32"/>`;
  const ball = `<circle cx="${round(x)}" cy="${round(y)}" r="${MARBLE}" fill="url(#__ID__-m${pair})"/>`;
  const number =
    marks === "numbers"
      ? `<text class="tsu-num" x="${round(x)}" y="${round(y)}" dy=".35em" fill="${shades.ink}" ${numberType(pair + 1, MARBLE * 2, largest)}>${pair + 1}</text>`
      : "";
  if (ghost) return `<g>${shadow}${ball}${number}</g>`;
  const label = tsunagiSay(language, "marble", {
    n: pair + 1,
    row: Math.floor(cell / layout.size) + 1,
    col: (cell % layout.size) + 1,
  });
  const flag = flagged
    ? `<circle class="tsu-flag" data-pair="${pair}" cx="${round(x)}" cy="${round(y)}" r="${MARBLE + 4}" stroke="${lineColour(colourOfPair(colours, pair), marks)}"/>`
    : "";
  return `<g class="tsu-marble" data-pair="${pair}" data-cell="${cell}" role="img" aria-label="${escapeXml(label)}">${flag}${shadow}${ball}${number}</g>`;
}

/** A pair's line as SVG text: a group of its runs, or nothing for a pair with no line drawn. */
export function lineSvg(
  layout: LinkLayout,
  geometry: TsunagiGeometry,
  line: readonly number[],
  pair: number,
  stroke: string,
): string {
  return line.length < 2 ? "" : pieceSvg(linePiece(layout, geometry, line, pair, stroke));
}

/** A pair's line as a piece: its runs, each a stroke through its cells' middles. */
export function linePiece(
  layout: LinkLayout,
  geometry: TsunagiGeometry,
  line: readonly number[],
  pair: number,
  stroke: string,
): TsunagiPiece {
  const html = lineRuns(layout, geometry, line)
    .map(
      (run) =>
        `<polyline points="${run.map((point) => `${round(point.x)},${round(point.y)}`).join(" ")}" stroke="${stroke}"/>`,
    )
    .join("");
  return {
    key: `line-${pair}`,
    attributes: { class: "tsu-line", "data-pair": String(pair), "data-cells": String(line.length) },
    html,
  };
}

/** A portal: its two rings, each with the portal's mark, and the link between them, shown on hover or when a page marks the portal `data-linked`. */
export function portalSvg(
  geometry: TsunagiGeometry,
  a: number,
  b: number,
  index: number,
  language: TsunagiLanguage,
  linked: boolean,
): string {
  const colour = hsl(TSUNAGI_PORTAL_COLOURS[index % TSUNAGI_PORTAL_COLOURS.length]!);
  const mark = portalMark(index);
  const [from, to] = [geometry.centre(a), geometry.centre(b)];
  // The link bows a little to one side, so that it is never mistaken for a line.
  const bow = { x: (from.x + to.x) / 2 + (from.y - to.y) * 0.12, y: (from.y + to.y) / 2 + (to.x - from.x) * 0.12 };
  const link = `<path class="tsu-portal-link" d="M${round(from.x)} ${round(from.y)}Q${round(bow.x)} ${round(bow.y)} ${round(to.x)} ${round(to.y)}" stroke="${colour}"/>`;
  const ring = (cell: number, at: TsunagiPoint) =>
    `<g class="tsu-portal-end" data-cell="${cell}"><circle cx="${round(at.x)}" cy="${round(at.y)}" r="40" fill="${colour}" fill-opacity=".14" stroke="${colour}" stroke-width="7"/><circle cx="${round(at.x)}" cy="${round(at.y)}" r="28" fill="none" stroke="${colour}" stroke-width="3" stroke-dasharray="4 6" stroke-linecap="round"/><text class="tsu-glyph" x="${round(at.x)}" y="${round(at.y)}" dy=".35em" fill="${colour}" font-size="${mark.length > 1 ? 28 : 38}">${escapeXml(mark)}</text></g>`;
  const label = tsunagiSay(language, "portal", {
    n: index + 1,
    mark,
    row: Math.floor(a / geometry.size) + 1,
    col: (a % geometry.size) + 1,
    row2: Math.floor(b / geometry.size) + 1,
    col2: (b % geometry.size) + 1,
  });
  return `<g class="tsu-portal" data-portal="${index}" data-cells="${a},${b}"${linked ? ' data-linked="true"' : ""} role="img" aria-label="${escapeXml(label)}">${link}${ring(a, from)}${ring(b, to)}</g>`;
}

export function beadSvg(geometry: TsunagiGeometry, cell: number, pair: number): string {
  const { x, y } = geometry.centre(cell);
  return `<g class="tsu-bead" data-pair="${pair}" data-cell="${cell}"><circle cx="${round(x)}" cy="${round(y + 2)}" r="${BEAD}" fill="#000" opacity=".3"/><circle cx="${round(x)}" cy="${round(y)}" r="${BEAD}" fill="url(#__ID__-b${pair})"/></g>`;
}

/** The rules and the edge of a board with a shape, cell by cell: a rule where two cells on the board meet, the edge where one meets what is off it. */
export function shapeRules(layout: LinkLayout, geometry: TsunagiGeometry): string[] {
  const { size } = layout;
  const half = CELL / 2;
  let grid = "";
  let edge = "";
  const on = (col: number, row: number): boolean =>
    col >= 0 && row >= 0 && col < size && row < size && geometry.onBoard(row * size + col);
  for (let cell = 0; cell < size * size; cell += 1) {
    if (!geometry.onBoard(cell)) continue;
    const { x, y } = geometry.centre(cell);
    const [col, row] = [cell % size, Math.floor(cell / size)];
    const [left, right, top, bottom] = [round(x - half), round(x + half), round(y - half), round(y + half)];
    if (on(col + 1, row)) grid += `M${right} ${top}V${bottom}`;
    else edge += `M${right} ${top}V${bottom}`;
    if (on(col, row + 1)) grid += `M${left} ${bottom}H${right}`;
    else edge += `M${left} ${bottom}H${right}`;
    if (!on(col - 1, row)) edge += `M${left} ${top}V${bottom}`;
    if (!on(col, row - 1)) edge += `M${left} ${top}H${right}`;
  }
  return [`<path class="tsu-grid" d="${grid}"/>`, `<path class="tsu-border" d="${edge}"/>`];
}
