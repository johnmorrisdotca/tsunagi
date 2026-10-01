/**
 * Tsunagi, played in a page: `mountTsunagi` draws a level into any element and
 * plays it by touch and mouse, with Undo, Restart, Check and Cheat, the zoom
 * pad for big boards, and the words in English and Japanese. A separate entry
 * (`@johnmorrisdotca/tsunagi/play`), so a server never loads any of it.
 */
export { ensureTsunagiPlayStyle, mountTsunagi } from "./mount.ts";
export type { TsunagiEventDetail, TsunagiLook, TsunagiMount, TsunagiMountOptions } from "./mount.ts";
export { TSUNAGI_PLAY_STYLE } from "./playStyle.ts";
export { edgeNudge, keptView, TSUNAGI_EDGE, TSUNAGI_EDGE_STEP, TSUNAGI_FITTED, TSUNAGI_MOST_ZOOM, TSUNAGI_ZOOM_FROM, zoomedAbout } from "./viewport.ts";
export type { TsunagiView } from "./viewport.ts";
