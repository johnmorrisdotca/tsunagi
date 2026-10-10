/**
 * Defines the `<tsunagi-board>` element on the page. Import it for its effect:
 *
 * ```html
 * <script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@1/dist/element-define.js"></script>
 * <tsunagi-board size="6" level="3"></tsunagi-board>
 * ```
 *
 * A tag already defined is left as it is, and on a server, where there is no page, nothing happens.
 */
import { defineBoard } from "./element.ts";
defineBoard();
export * from "./element.ts";
