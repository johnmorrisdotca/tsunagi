# In Angular and Next.js

How to use `<tsunagi-board>` in Angular and in Next.js. The React, Vue and Svelte recipes are in [the README](../README.md#3-a-bundler-and-a-framework). Moved here to keep the README under the length npm shows.

```ts no-check
// Angular: a standalone component with CUSTOM_ELEMENTS_SCHEMA
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@johnmorrisdotca/tsunagi/element/define";

@Component({
  selector: "app-level",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<tsunagi-board size="6" level="3" (tsunagi-solve)="solved($event)"></tsunagi-board>`,
})
export class Level {
  solved(event: Event) { console.log((event as CustomEvent).detail.answer); }
}
```

In Next.js or any server-rendering framework, import the define entry from a client component, so the tag is defined in the browser. Or skip the tag and call `mountTsunagi(element, options)` from `@johnmorrisdotca/tsunagi/play` in an effect: the handle it returns has `destroy()`.

`pnpm test:frameworks` builds these recipes from the packed tarball for each of the five and plays a level to its end in Chromium and WebKit; it needs the network and a few minutes, so it runs before a release and in CI, not with `pnpm check`.
