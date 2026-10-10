# Embed a fixed or UTC daily line puzzle

[Open the builder](https://johnmorrisdotca.github.io/tsunagi/builder.html) to preview classic or portal levels and copy an element, iframe, module, React 19, Vue, Svelte, Angular, plain HTML block or iframe URL. Its pin follows the package major. Its link carries the setup; the iframe stores nothing.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@1/dist/element-define.js"></script>
<tsunagi-board grid="7" level="12" size="medium"></tsunagi-board>
<tsunagi-board grid="7" set="portals" daily="2026-10-09" size="small"></tsunagi-board>
```

`size` is the display width: small 320, medium 480 or large 640 pixels. `grid` is the number of cells on each side. Every old numeric `size` remains a grid alias. A new grid/daily embed defaults to medium display width, and `width` overrides it while fitting the parent. Explicit light/dark `theme` also works in shadow roots. `label` is optional spoken text; native `lang` remains reflected.

`daily="today"`, an empty attribute, `on`, `true` or `1` uses the current UTC day; a real `YYYY-MM-DD` fixes one. Off aliases are `off`, `false`, `no` and `0`. Classic levels keep the established `dailyTsunagiLevel` ladder. Portal levels use the shared UTC date-seed helper, namespaced by set and grid, over that grid's portal list. A custom givens board takes precedence. Changing the day starts fresh play, with no rollover timer.

Every observed attribute has a reflected property, including camel-case `colourSet`. The `progress` getter still reads the structured live progress; its setter accepts a kept lines code. Existing methods and game/mount getters remain available. Host callbacks and custom colour/board palettes belong to `options`; changing a callback does not restart play. `defineBoard(tag?)` registers a standard or custom tag without replacing a definition. Coverage is checked against actual attributes and mounted-board option keys, with reasons for custom layouts, answers, kept play state and callbacks left to host code.

Tab to the board. Arrow keys move the visible cursor; Enter or Space on a marble starts a line, arrows draw it, and Enter or Space ends it. Escape cancels the current line. Q and E reach the other hexagon neighbours. The cursor follows the line through portals, supports wrapped edges and pans into view when zoomed. Row and column are announced. Pointer drawing, undo and existing play rules are unchanged; reduced motion follows the existing player.

The transparent, noindex iframe is `embed/?grid=7&set=classic&level=12&size=medium`. It validates grid/set/level choices, dates, display and drawing choices, width, label, custom givens/answers and kept lines codes. Invalid values are ignored. The builder adjusts unsupported portal grids and levels and measures its controls to print a frame height that fits.

`tsunagi-change`, `tsunagi-stroke`, `tsunagi-explosion` and `tsunagi-solve` bubble across shadow boundaries with JSON-safe detail. `tsunagi-load` adds `{ grid, set, level, day }`; `tsunagi-error` adds `{ message }`. The iframe forwards the identical detail as `{ type: event.type, detail: event.detail }`. Hosts must check both `event.origin === "https://johnmorrisdotca.github.io"` and `event.source === iframe.contentWindow` before using a message. No visitor identity fields are included.
