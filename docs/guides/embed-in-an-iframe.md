---
title: Embed in an iframe
section: how-to
order: 12
description: Show a Tsunagi board on a page that cannot run script, with one iframe of the embed page.
---

An iframe of the embed page needs no code of your own, and keeps the board apart from the page's styles. The address chooses what is shown. The keys are the tag's attribute names: `grid`, `set`, `level`, `width`, `board`, `theme` and `lang`.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tsunagi in an iframe</title>
  </head>
  <body>
    <iframe
      src="https://johnmorrisdotca.github.io/tsunagi/embed/?grid=6&level=12"
      title="A line puzzle: Tsunagi, 6×6, level 12"
      width="496"
      height="600"
      loading="lazy"
      style="border: 0; max-width: 100%"
    ></iframe>
  </body>
</html>
```

## Notes

- Give the frame a `title` and a size. The board fits a narrower frame, and the page inside has no scroll bars.
- The frame sends the board's events to the page as messages. Check `event.origin` and `event.source` before you read one.
- The embed page is the same board the tag draws, so the attributes of the tag ([plain HTML and CDNs](html-and-cdn.md)) and the keys of the address have the same names.
