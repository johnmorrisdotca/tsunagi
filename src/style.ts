/**
 * THE STYLE a Tsunagi drawing wears: the colours of its board as custom
 * properties, the two things that move (a flashing ring round a marble Check
 * found unjoined, and the burst where an explosion took a line out), and the
 * one rule that matters for a puzzle played with fingers: nothing in the
 * drawing can be selected, dragged or double-tapped.
 *
 * `drawTsunagi` only writes classes, data attributes and, for a board other
 * than the plain paper, the custom properties below; this is what gives them
 * a look. Every colour is a custom property on `.tsunagi` (`--tsu-paper`,
 * `--tsu-paper-deep`, `--tsu-frame`, `--tsu-grid`, `--tsu-ink`,
 * `--tsu-coordinate`, `--tsu-shu`, `--tsu-good`), so a page's own style needs to set only the ones it
 * wants different. Paper follows the page's light or dark. With reduced motion
 * asked for, nothing moves.
 */
export const TSUNAGI_STYLE = `
.tsunagi {
  --tsu-paper: #fbf8f1; --tsu-paper-deep: #fbf8f1; --tsu-frame: #a98954; --tsu-grid: #cfc6b2; --tsu-ink: #1f2320;
  --tsu-coordinate: #5b3d1c; --tsu-shu: #d9381e; --tsu-good: #2f7a4f;
  --tsu-font: system-ui, -apple-system, "Segoe UI", sans-serif;
  display: block; width: 100%; height: auto;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none; -webkit-tap-highlight-color: transparent;
  overflow: visible;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tsunagi[data-board="paper"] { --tsu-paper: #262a27; --tsu-paper-deep: #262a27; --tsu-frame: #6b5632; --tsu-grid: #3f443f; --tsu-ink: #ece8dc; --tsu-coordinate: #e8d3b6; }
}
:root[data-theme="dark"] .tsunagi[data-board="paper"] { --tsu-paper: #262a27; --tsu-paper-deep: #262a27; --tsu-frame: #6b5632; --tsu-grid: #3f443f; --tsu-ink: #ece8dc; --tsu-coordinate: #e8d3b6; }
.tsunagi * { user-select: none; -webkit-user-select: none; }
.tsunagi .tsu-frame { fill: var(--tsu-frame); }
.tsunagi .tsu-paper-stop-a { stop-color: var(--tsu-paper); }
.tsunagi .tsu-paper-stop-b { stop-color: var(--tsu-paper-deep); }
.tsunagi .tsu-solved { fill: var(--tsu-good); opacity: .14; pointer-events: none; }
.tsunagi .tsu-grid { fill: none; stroke: var(--tsu-grid); stroke-width: 1px; vector-effect: non-scaling-stroke; }
.tsunagi .tsu-hex-cell { fill: none; stroke: var(--tsu-grid); stroke-width: 1px; vector-effect: non-scaling-stroke; }
.tsunagi .tsu-border { fill: none; stroke: var(--tsu-ink); stroke-width: 2.5px; vector-effect: non-scaling-stroke; opacity: .7; }
.tsunagi .tsu-rim { fill: none; stroke: var(--tsu-ink); stroke-width: 2px; stroke-dasharray: 6 4; vector-effect: non-scaling-stroke; opacity: .7; }
.tsunagi .tsu-blocked { fill: var(--tsu-ink); opacity: .55; }
.tsunagi .tsu-wall { stroke: var(--tsu-ink); stroke-width: 14; stroke-linecap: round; }
.tsunagi .tsu-deck { fill: var(--tsu-ink); opacity: .22; }
.tsunagi .tsu-rail { stroke: var(--tsu-ink); stroke-width: 7; stroke-linecap: round; }
.tsunagi .tsu-line polyline, .tsunagi .tsu-over-bridge { fill: none; stroke-width: 30; stroke-linecap: round; stroke-linejoin: round; }
.tsunagi .tsu-num { font-family: var(--tsu-font); font-weight: 700; text-anchor: middle; font-variant-numeric: tabular-nums; pointer-events: none; }
.tsunagi .tsu-coordinate { fill: var(--tsu-coordinate); font-family: var(--tsu-font); font-weight: 600; font-size: 24px; text-anchor: middle; pointer-events: none; }
.tsunagi .tsu-glyph { font-family: var(--tsu-font); font-weight: 700; text-anchor: middle; pointer-events: none; }
.tsunagi .tsu-portal-link { fill: none; stroke-width: 5; stroke-dasharray: 2 10; stroke-linecap: round; opacity: 0; pointer-events: none; transition: opacity .15s; }
.tsunagi .tsu-portal:hover .tsu-portal-link, .tsunagi .tsu-portal[data-linked="true"] .tsu-portal-link { opacity: .65; }
.tsunagi .tsu-ghosts { opacity: .35; pointer-events: none; }
.tsunagi .tsu-flag { fill: none; stroke-width: 8; transform-box: fill-box; transform-origin: center; animation: tsu-ping 1s cubic-bezier(0, 0, .2, 1) infinite; pointer-events: none; }
.tsunagi .tsu-blast { fill: var(--tsu-shu); fill-opacity: .4; stroke: var(--tsu-shu); stroke-width: 8; transform-box: fill-box; transform-origin: center; animation: tsu-ping 1s cubic-bezier(0, 0, .2, 1) infinite; pointer-events: none; }
@keyframes tsu-ping { 75%, 100% { transform: scale(1.7); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .tsunagi .tsu-flag, .tsunagi .tsu-blast { animation: none; }
}
`;
