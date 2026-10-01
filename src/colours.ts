/**
 * THE COLOURS A TSUNAGI BOARD IS DRAWN IN: a set of colours, one for each pair
 * of marbles, and how each is shaded for a marble, a line and the faint wash a
 * line leaves on the cells it runs through. A colour is hue, saturation and
 * lightness, so one colour can be shaded lighter for the marble's highlight
 * and darker for its rim the way a real marble is.
 *
 * Marks are the other way to tell the pairs apart: `colours` paints each pair
 * in its colour, `numbers` puts the pair's number on a plain shell marble and
 * draws every line in a soft tint, for a player who would rather read a number
 * than tell two blues apart. Both are the same puzzle.
 */

/** A colour as hue (0 to 360), saturation and lightness (each 0 to 100). */
export type TsunagiColour = readonly [number, number, number];

/** How the pairs are told apart: by colour, or by the number on each pair's marbles. */
export type TsunagiMarks = "colours" | "numbers";

/** Marbles along every line (the dots), or the line alone. */
export type TsunagiFill = "marbles" | "lines";

/** The colour sets there are. */
export const TSUNAGI_COLOUR_SET_NAMES = ["marble", "bright", "colour-blind", "soft"] as const;
export type TsunagiColourSetName = (typeof TSUNAGI_COLOUR_SET_NAMES)[number];

/** The sets' default: the one itsutsu.com plays in. */
export const TSUNAGI_DEFAULT_COLOUR_SET: TsunagiColourSetName = "marble";

function fromHex(hex: string): TsunagiColour {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const most = Math.max(red, green, blue);
  const least = Math.min(red, green, blue);
  const light = (most + least) / 2;
  if (most === least) return [0, 0, Math.round(light * 100)];
  const span = most - least;
  const saturation = light > 0.5 ? span / (2 - most - least) : span / (most + least);
  const hue = most === red ? (green - blue) / span + (green < blue ? 6 : 0) : most === green ? (blue - red) / span + 2 : (red - green) / span + 4;
  return [Math.round(hue * 60), Math.round(saturation * 100), Math.round(light * 100)];
}

/**
 * Sixteen colours each, as many pairs as the biggest board has. `marble`:
 * twelve of them mostly from Okabe and Ito's palette for colour-blind readers,
 * ordered so the five pairs of a small board are the most unlike (no two
 * blues, and no green, which a green board would swallow), then four for the
 * big boards. `bright`: a plainer, louder set. `colour-blind`: Okabe and Ito's
 * eight, then each again a shade lighter or darker; past eight, numbers are the
 * better help. `soft`: pastels, for a board that should look quiet.
 */
export const TSUNAGI_COLOUR_SETS: Record<TsunagiColourSetName, readonly TsunagiColour[]> = {
  marble: [
    [24, 100, 44], // vermillion
    [202, 77, 60], // sky blue
    [54, 88, 56], // yellow
    [326, 48, 62], // reddish purple
    [40, 22, 90], // shell
    [36, 100, 50], // orange
    [218, 90, 36], // deep blue
    [164, 100, 31], // bluish green
    [340, 82, 74], // pink
    [85, 58, 47], // leaf
    [28, 45, 36], // chestnut
    [220, 8, 22], // slate
    [300, 80, 45], // magenta
    [350, 70, 28], // maroon
    [186, 90, 48], // cyan
    [0, 0, 62], // grey
  ],
  bright: ["#d7263d", "#1b6ca8", "#f2a541", "#2e933c", "#8e44ad", "#e86a92", "#16a3a3", "#7a4b2a", "#f25c05", "#4b5d67", "#a3b915", "#c2185b", "#3949ab", "#00897b", "#b8860b", "#6d4c41"].map(fromHex),
  "colour-blind": ["#e69f00", "#56b4e9", "#009e73", "#f0e442", "#0072b2", "#d55e00", "#cc79a7", "#6b6b6b", "#f7c96b", "#a6dcf5", "#66c9ac", "#f7f1a0", "#66a9d4", "#e89b66", "#e0aecb", "#b3b3b3"].map(fromHex),
  soft: Array.from({ length: 16 }, (_, at): TsunagiColour => [Math.round((at * 137.5) % 360), 55, 64]),
};

/** A colour set as asked: one of the named sets, or colours of your own (used round and round when a board has more pairs than you gave). */
export function tsunagiColourSet(set: TsunagiColourSetName | readonly TsunagiColour[] | undefined): readonly TsunagiColour[] {
  if (set === undefined) return TSUNAGI_COLOUR_SETS[TSUNAGI_DEFAULT_COLOUR_SET];
  if (typeof set === "string") return TSUNAGI_COLOUR_SETS[set] ?? TSUNAGI_COLOUR_SETS[TSUNAGI_DEFAULT_COLOUR_SET];
  return set.length > 0 ? set : TSUNAGI_COLOUR_SETS[TSUNAGI_DEFAULT_COLOUR_SET];
}

/** The colour of a pair in a set, round and round. */
export function colourOfPair(set: readonly TsunagiColour[], pair: number): TsunagiColour {
  return set[((pair % set.length) + set.length) % set.length]!;
}

/** A colour as a CSS string, lightened or darkened by `shift` percentage points, at an opacity. */
export function hsl([hue, saturation, lightness]: TsunagiColour, shift = 0, alpha = 1): string {
  const light = Math.max(4, Math.min(97, lightness + shift));
  return alpha === 1 ? `hsl(${hue}, ${saturation}%, ${light}%)` : `hsla(${hue}, ${saturation}%, ${light}%, ${alpha})`;
}

/** The plain shell marble a number is written on: highlight, body, rim, and the ink. */
export const TSUNAGI_SHELL = { light: "#ffffff", body: "#ececec", rim: "#bfbfbf", ink: "#1a1a1a" } as const;

/** A marble's shading: the highlight at its upper left, its body, and its rim, and the ink its number is written in. */
export function marbleShades(colour: TsunagiColour, marks: TsunagiMarks): { light: string; body: string; rim: string; ink: string } {
  if (marks === "numbers") return TSUNAGI_SHELL;
  return { light: hsl(colour, 28), body: hsl(colour), rim: hsl(colour, -22), ink: colour[2] > 55 ? "#1a1a1a" : "#ffffff" };
}

/** A marble on a line's way between its ends: the pair's colour, or for numbers the line's own soft tint, with nothing written on it. */
export function beadShades(colour: TsunagiColour, marks: TsunagiMarks): { light: string; body: string; rim: string } {
  if (marks === "colours") return marbleShades(colour, marks);
  const tint: TsunagiColour = [colour[0], 30, 62];
  return { light: hsl(tint, 22), body: hsl(tint), rim: hsl(tint, -18) };
}

/** The stroke a pair's line is drawn in: its colour, or a soft tint of it for numbers. */
export function lineColour(colour: TsunagiColour, marks: TsunagiMarks): string {
  return marks === "numbers" ? hsl([colour[0], 30, 62]) : hsl(colour);
}

/** The faint wash a line leaves on the cells it runs through. */
export function washColour(colour: TsunagiColour, marks: TsunagiMarks): string {
  return marks === "numbers" ? hsl([colour[0], 30, 70], 0, 0.22) : hsl(colour, 8, 0.28);
}
