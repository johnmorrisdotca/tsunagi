import { TSUNAGI_STYLE } from "./style.ts";

/**
 * THE STYLE a playable Tsunagi board wears (`mountTsunagi`, `<tsunagi-board>`):
 * the drawing's own (`TSUNAGI_STYLE`) and the board's box, its buttons, its
 * lines of words and its zoom pad. Colours are custom properties on
 * `.tsunagi-play` (`--tsp-ink`, `--tsp-muted`, `--tsp-rule`, `--tsp-surface`,
 * `--tsp-accent`, `--tsp-good`) so a page sets only what it wants different.
 *
 * Nothing moves when something is chosen: the board is one square box, the
 * lines of words keep the room their longest wording takes, and the buttons
 * are one size. Nothing the player touches can be selected.
 */
export const TSUNAGI_PLAY_STYLE = `${TSUNAGI_STYLE}
.tsunagi-play {
  --tsp-ink: #1f2320; --tsp-muted: #6b6f68; --tsp-rule: #ddd6c6; --tsp-surface: #fbf8f1; --tsp-accent: #b5452c; --tsp-good: #2f7a4f;
  display: block; max-width: 100%; box-sizing: border-box; color: var(--tsp-ink); font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tsunagi-play { --tsp-ink: #ece8dc; --tsp-muted: #a09d93; --tsp-rule: #3a3d38; --tsp-surface: #1d201e; --tsp-accent: #ff8a6b; --tsp-good: #6fcf97; }
}
:root[data-theme="dark"] .tsunagi-play { --tsp-ink: #ece8dc; --tsp-muted: #a09d93; --tsp-rule: #3a3d38; --tsp-surface: #1d201e; --tsp-accent: #ff8a6b; --tsp-good: #6fcf97; }
.tsunagi-play *, .tsunagi-play *::before, .tsunagi-play *::after { box-sizing: border-box; }
.tsunagi-play .tsp-box { position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; }
.tsunagi-play .tsp-box[data-over="true"] { cursor: default; }
.tsunagi-play .tsp-inner { position: absolute; top: 0; left: 0; width: 100%; transform-origin: 0 0; }
.tsunagi-play .tsp-pad, .tsunagi-play .tsp-chips, .tsunagi-play .tsp-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
.tsunagi-play .tsp-pad { justify-content: center; }
.tsunagi-play .tsp-pad[hidden], .tsunagi-play [hidden] { display: none !important; }
.tsunagi-play button { font: inherit; color: inherit; user-select: none; -webkit-user-select: none; touch-action: manipulation; }
.tsunagi-play .tsp-button, .tsunagi-play .tsp-chip { border: 1px solid var(--tsp-rule); background: var(--tsp-surface); color: var(--tsp-ink); border-radius: 999px; min-height: 44px; min-width: 44px; padding: 0 14px; font-size: .85rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
.tsunagi-play .tsp-button:hover:not(:disabled), .tsunagi-play .tsp-chip:hover { border-color: var(--tsp-ink); }
.tsunagi-play .tsp-button:disabled { opacity: .32; cursor: default; }
.tsunagi-play .tsp-chip { min-height: 32px; min-width: 0; padding: 0 10px; font-size: .75rem; white-space: nowrap; }
.tsunagi-play .tsp-chip[aria-expanded="true"] { border-color: var(--tsp-ink); box-shadow: 0 0 0 1px var(--tsp-ink); }
.tsunagi-play .tsp-chip[data-strong="true"] { background: var(--tsp-ink); color: var(--tsp-surface); }
.tsunagi-play .tsp-chip .tsp-off { opacity: .3; }
.tsunagi-play .tsp-says { margin: 6px 0 0; font-size: .8rem; color: var(--tsp-muted); }
.tsunagi-play .tsp-progress { margin: 10px 0 0; font-weight: 600; font-size: .9rem; min-height: 1.4em; font-variant-numeric: tabular-nums; }
.tsunagi-play[data-solved="true"] .tsp-progress { color: var(--tsp-good); }
.tsunagi-play .tsp-messages { margin: 4px 0 0; min-height: 1.5em; display: grid; align-content: start; gap: 2px; }
.tsunagi-play .tsp-messages p { margin: 0; font-size: .85rem; line-height: 1.4; color: var(--tsp-muted); }
.tsunagi-play .tsp-messages p[data-warn="true"] { color: var(--tsp-accent); font-weight: 600; }
.tsunagi-play .tsp-hint { margin: 6px 0 0; font-size: .8rem; color: var(--tsp-muted); }
`;
