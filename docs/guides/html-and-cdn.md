---
title: Plain HTML and CDNs
section: how-to
order: 11
description: Put a Tsunagi board on a plain page with one script tag from jsDelivr or unpkg.
---

A page needs no build step. The `element/define` entry registers the `<tsunagi-board>` tag; a script tag from a CDN loads it, and the tag draws itself in the page. What the board needs is in the package, so nothing else is fetched.

## jsDelivr

jsDelivr serves the package's own files.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tsunagi from jsDelivr</title>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/tsunagi@1/dist/element-define.js"></script>
  </head>
  <body>
    <tsunagi-board grid="6" level="12"></tsunagi-board>
  </body>
</html>
```

## unpkg

unpkg serves them too.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tsunagi from unpkg</title>
    <script type="module" src="https://unpkg.com/@johnmorrisdotca/tsunagi@1/dist/element-define.js"></script>
  </head>
  <body>
    <tsunagi-board grid="6" level="12"></tsunagi-board>
  </body>
</html>
```

## Notes

- Use `<script type="module">`. A classic script cannot `import`.
- The address names the major version (`@1`), so a release that changes what you use is one you choose.
- The page reaches the board through its attributes and events: see [embed in an iframe](embed-in-an-iframe.md) for the attribute names, and [troubleshooting](troubleshooting.md) if nothing appears.
