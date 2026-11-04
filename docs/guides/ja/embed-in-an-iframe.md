---
title: iframe で埋め込む
section: how-to
order: 12
description: スクリプトを動かせないページでも、埋め込み用ページの iframe 1つで盤を表示できます。
---

埋め込み用ページの iframe には、自分のコードは要りません。ページのスタイルとも切り離されます。アドレスで表示するものを選びます。キーはタグの属性と同じ名前です（`grid`、`set`、`level`、`width`、`board`、`theme`、`lang`）。

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

## 注意

- iframe には `title` と大きさを付けます。盤は狭い枠にも収まり、中のページにスクロールバーは出ません。
- iframe は盤のイベントをメッセージとして親のページに送ります。読む前に `event.origin` と `event.source` を確かめてください。
- 埋め込み用ページは、タグが描く盤と同じものです。タグの属性（[通常の HTML と CDN](html-and-cdn.md)）とアドレスのキーは同じ名前です。
