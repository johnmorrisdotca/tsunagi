/**
 * Tsunagi's drawing: a board as SVG text, with its colour sets, its boards,
 * the style that gives the drawing its look, and where everything sits in it
 * (so a page can tell which cell a finger is over). A separate entry
 * (`@johnmorrisdotca/tsunagi/draw`), so a server that only checks an answer
 * never loads any of it.
 */
export * from "./draw.ts";
export * from "./colours.ts";
export * from "./boards.ts";
export * from "./geometry.ts";
export { TSUNAGI_STYLE } from "./style.ts";
export { TSUNAGI_STRINGS, tsunagiLanguageOf, tsunagiSay } from "./strings.ts";
export type { TsunagiLanguage } from "./strings.ts";
