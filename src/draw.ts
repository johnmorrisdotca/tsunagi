import { decodeLayout, type LinkLayout } from "./code.ts";
import {
  colourOfPair,
  lineColour,
  marbleShades,
  type TsunagiColour,
  type TsunagiColourSetName,
  type TsunagiMarks,
  tsunagiColourSet,
  washColour,
} from "./colours.ts";
import {
  attributesOf,
  beadSvg,
  escapeXml,
  lineSvg,
  numberType,
  pieceSvg,
  stops,
  type TsunagiDrawOptions,
  tsunagiDrawing,
} from "./drawing.ts";
import { CELL, HEX_RADIUS, hexagonPoints, round, tsunagiGeometry } from "./geometry.ts";
import { noLines, ownersOf } from "./lines.ts";
import { TSUNAGI_STYLE } from "./style.ts";

export type { TsunagiDrawing, TsunagiDrawOptions, TsunagiPiece } from "./drawing.ts";
export { tsunagiDrawing } from "./drawing.ts";

/**
 * A board as SVG text, with the lines in `options.lines` drawn on it. The
 * drawing is `class="tsunagi"`; its colours and its two movements are
 * `TSUNAGI_STYLE`. Its parts carry classes and data attributes a page can style
 * or find: `tsu-marble`, `tsu-bead`, `tsu-line` (`data-pair`, `data-cells`),
 * `tsu-bridge` (`data-cell`, `data-across`), `tsu-over-bridge`, `tsu-wall`
 * (`data-edge`), `tsu-waypoint`, `tsu-portal` (`data-portal`, `data-cells`;
 * its two rings are `tsu-portal-end`, its link `tsu-portal-link`), `tsu-flag`,
 * `tsu-blast`, `tsu-hex-cell`.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param options - Native drawing, geometry, game or mount settings.
 * @returns A board as SVG text, with the lines in `options.lines` drawn on it. The drawing is `class="tsunagi"`; its colours and its two movements are `TSUNAGI_STYLE`. Its parts carry classes and data attributes a page can style or find: `tsu-marble`, `tsu-bead`, `tsu-line` (`data-pair`, `data-cells`), `tsu-bridge` (`data-cell`, `data-across`), `tsu-over-bridge`, `tsu-wall` (`data-edge`), `tsu-waypoint`, `tsu-portal` (`data-portal`, `data-cells`; its two rings are `tsu-portal-end`, its link `tsu-portal-link`), `tsu-flag`, `tsu-blast`, `tsu-hex-cell`.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 * import { drawTsunagi } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(drawTsunagi(layout,{marks:"numbers"}).startsWith("<svg"));
 * ```
 */
export function drawTsunagi(layout: LinkLayout, options: TsunagiDrawOptions = {}): string {
  const drawing = tsunagiDrawing(layout, options);
  const variables = Object.entries(drawing.variables)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  const style = variables === "" ? "" : ` style="${variables}"`;
  const inside = options.style === true ? `<style>${TSUNAGI_STYLE}</style>` : "";
  return `<svg ${attributesOf(drawing.attributes)}${style}>${inside}${drawing.pieces.map(pieceSvg).join("")}</svg>`;
}

/** A level's layout code drawn, or an empty string for a code that is no layout at that size.
 *
 * @param givens - The original native layout code.
 * @param size - The number of cells on each side of the board.
 * @param options - Native drawing, geometry, game or mount settings.
 * @returns A level's layout code drawn, or an empty string for a code that is no layout at that size.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { drawTsunagiCode } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const givens = TSUNAGI_4[0][0];
 * console.log(drawTsunagiCode(givens,4).startsWith("<svg"));
 * ```
 */
export function drawTsunagiCode(givens: string, size: number, options: TsunagiDrawOptions = {}): string {
  const layout = decodeLayout(givens, size);
  return layout === null ? "" : drawTsunagi(layout, options);
}

/** One marble on its own, as SVG text: for a legend or an icon. `pair` is which of the board's pairs it is, from 0.
 *
 * @param pair - The zero-based pair index.
 * @param options - Native drawing, geometry, game or mount settings.
 * @returns One marble on its own, as SVG text: for a legend or an icon. `pair` is which of the board's pairs it is, from 0.
 * @example
 * ```ts
 * import { drawTsunagiMarble } from "@johnmorrisdotca/tsunagi/draw";
 *
 * console.log(drawTsunagiMarble(0,{marks:"numbers"}).length);
 * ```
 */
export function drawTsunagiMarble(
  pair: number,
  options: {
    marks?: TsunagiMarks;
    colours?: TsunagiColourSetName | readonly TsunagiColour[];
    label?: string;
    style?: boolean;
    id?: string;
  } = {},
): string {
  const marks = options.marks ?? "colours";
  const colours = tsunagiColourSet(options.colours);
  const shades = marbleShades(colourOfPair(colours, pair), marks);
  const id = options.id ?? `tsum${pair}${marks}`;
  const number =
    marks === "numbers"
      ? `<text class="tsu-num" x="50" y="50" dy=".35em" fill="${shades.ink}" ${numberType(pair + 1, 74)}>${pair + 1}</text>`
      : "";
  const label = options.label ?? `marble ${pair + 1}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="tsunagi" viewBox="0 0 100 100" role="img" aria-label="${escapeXml(label)}">${options.style === true ? `<style>${TSUNAGI_STYLE}</style>` : ""}<defs><radialGradient id="${id}" cx=".35" cy=".3" r=".955">${stops(shades)}</radialGradient></defs><circle cx="50" cy="53" r="37" fill="#000" opacity=".32"/><circle cx="50" cy="50" r="37" fill="url(#${id})"/>${number}</svg>`;
}

/**
 * What one pair's line is made of in a drawing, for a page that keeps a drawing in
 * its DOM and redraws only the pair whose line changed: its washes and its little
 * marbles, each to go inside the group of that pair's (`.tsu-washes > [data-pair]`
 * and `.tsu-beads > [data-pair]`, and `.tsu-ghosts > [data-pair]` on a board that
 * wraps), and its line (a `.tsu-line` for the `.tsu-lines` group, to replace any of
 * that pair's). `id` is the drawing's own (`<svg>`'s paper gradient is `<id>-paper`),
 * so the pieces use its gradients. Boards with bridges are drawn whole, since a bridge's
 * deck and the lines under it depend on every line.
 *
 * @param layout - The decoded native board and its rule settings.
 * @param pair - The zero-based pair index.
 * @param id - An SVG identifier prefix for this drawing.
 * @param options - Native drawing, geometry, game or mount settings.
 * @returns What one pair's line is made of in a drawing, for a page that keeps a drawing in its DOM and redraws only the pair whose line changed: its washes and its little marbles, each to go inside the group of that pair's (`.tsu-washes > [data-pair]` and `.tsu-beads > [data-pair]`, and `.tsu-ghosts > [data-pair]` on a board that wraps), and its line (a `.tsu-line` for the `.tsu-lines` group, to replace any of that pair's). `id` is the drawing's own (`<svg>`'s paper gradient is `<id>-paper`), so the pieces use its gradients. Boards with bridges are drawn whole, since a bridge's deck and the lines under it depend on every line.
 * @example
 * ```ts
 * import { TSUNAGI_4 } from "@johnmorrisdotca/tsunagi/levels-4";
 * import { decodeLayout } from "@johnmorrisdotca/tsunagi";
 * import { drawTsunagiPair } from "@johnmorrisdotca/tsunagi/draw";
 *
 * const givens = TSUNAGI_4[0][0];
 * const layout = decodeLayout(givens,4)!;
 * console.log(drawTsunagiPair(layout,0,"sample").line.length);
 * ```
 */
export function drawTsunagiPair(
  layout: LinkLayout,
  pair: number,
  id: string,
  options: TsunagiDrawOptions = {},
): { washes: string; line: string; beads: string; ghosts: string } {
  const lines = options.lines ?? noLines(layout);
  const marks = options.marks ?? "colours";
  const fill = options.fill ?? "marbles";
  const colours = tsunagiColourSet(options.colours);
  const geometry = tsunagiGeometry(layout, {
    coordinates: options.coordinates,
    ghosts: options.ghosts,
    surface: options.surface,
  });
  const owners = ownersOf(layout, lines);
  const colour = colourOfPair(colours, pair);
  const washed: string[] = [];
  const beads: string[] = [];
  const ghosts: string[] = [];
  const { size, hex } = layout;
  const wash = washColour(colour, marks);
  layout.cells.forEach((cell, at) => {
    if (!geometry.onBoard(at) || owners[at] !== pair || cell >= 0) return;
    const { x, y } = geometry.centre(at);
    if (hex) washed.push(`<polygon points="${hexagonPoints(x, y, HEX_RADIUS * CELL)}" fill="${wash}"/>`);
    else
      washed.push(
        `<rect x="${round(x - CELL / 2)}" y="${round(y - CELL / 2)}" width="${CELL}" height="${CELL}" fill="${wash}"/>`,
      );
    if (fill === "marbles" && !layout.portals.has(at)) beads.push(beadSvg(geometry, at, pair));
  });
  if (geometry.ring > 0 && fill === "marbles") {
    const span = size + 2 * geometry.ring;
    for (let down = 0; down < span; down += 1) {
      for (let across = 0; across < span; across += 1) {
        if (across >= 1 && across <= size && down >= 1 && down <= size) continue;
        const at = ((down - 1 + size) % size) * size + ((across - 1 + size) % size);
        if (layout.cells[at]! >= 0 || owners[at] !== pair) continue;
        const middle = { x: geometry.paper.x + (across + 0.5) * CELL, y: geometry.paper.y + (down + 0.5) * CELL };
        ghosts.push(beadSvg({ ...geometry, centre: () => middle }, at, pair));
      }
    }
  }
  return {
    washes: washed.join("").replaceAll("__ID__", id),
    line: lineSvg(layout, geometry, lines[pair] ?? [], pair, lineColour(colour, marks)),
    beads: beads.join("").replaceAll("__ID__", id),
    ghosts: ghosts.join("").replaceAll("__ID__", id),
  };
}
