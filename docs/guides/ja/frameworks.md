---
title: React・Vue・Svelte・Angular
section: how-to
order: 14
description: React・Vue・Svelte・Angular で盤の要素を使います。サーバーでの描画も壊れないインポートです。
---

`<tsunagi-board>` は Web コンポーネントなので、どのフレームワークでも使えます。共通の注意が2つあります。

1. **タグを登録する入口を読み込みます**（`@johnmorrisdotca/tsunagi/element/define`）。サーバーで読み込んでも安全で、何も登録されません。盤はブラウザーで描かれます。
2. **そのタグがあることをフレームワークに伝えます。** React には型、Vue にはコンパイラーの設定、Angular にはスキーマが要ります。Svelte は何も要りません。

## React

`Level.tsx` です。React 19 は属性をそのままカスタム要素に渡します。

```tsx
import "@johnmorrisdotca/tsunagi/element/define";

export function Level({ grid = "6", level = 12 }: { grid?: string; level?: number }) {
  return <tsunagi-board grid={grid} level={String(level)} />;
}
```

TypeScript では、React にタグがあることを伝えます（`tsunagi-board.d.ts` のようなファイル）。

```ts no-check
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "tsunagi-board": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { grid?: string; level?: string; set?: string; board?: string; marks?: string; lang?: string; theme?: string };
    }
  }
}
```

いつもどおりに載せます。

```tsx
import { createRoot } from "react-dom/client";
import { Level } from "./Level";

createRoot(document.getElementById("root")!).render(<Level />);
```

このコンポーネントはサーバーでも文字列として描けます（`renderToString`）。パッケージのテストで確かめています。HTML にタグが入り、盤はブラウザーで描かれます。

```tsx
import { renderToString } from "react-dom/server";
import { Level } from "./Level";

console.log(renderToString(<Level />));
```

## Vue

```vue
<script setup lang="ts">
import "@johnmorrisdotca/tsunagi/element/define";

withDefaults(defineProps<{ grid?: string; level?: number }>(), { grid: "6", level: 12 });
</script>

<template>
  <tsunagi-board :grid="grid" :level="level"></tsunagi-board>
</template>
```

`tsunagi-*` のタグはカスタム要素だと、`vite.config.mjs` で Vue のコンパイラーに伝えます。

```js no-check
import vue from "@vitejs/plugin-vue";

export default {
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith("tsunagi-") } } })],
};
```

あとはいつもどおりに載せます。

```ts no-check
import { createApp } from "vue";
import Level from "./Level.vue";

createApp(Level).mount("#app");
```

## Svelte

```svelte
<script lang="ts">
  import "@johnmorrisdotca/tsunagi/element/define";

  let { grid = "6", level = 12 }: { grid?: string; level?: number } = $props();
</script>

<tsunagi-board {grid} {level}></tsunagi-board>
```

```ts no-check
import { mount } from "svelte";
import Level from "./Level.svelte";

mount(Level, { target: document.getElementById("app")! });
```

## Angular

スタンドアロンで、知らないタグをテンプレートに書けるよう `CUSTOM_ELEMENTS_SCHEMA` を付けます。

```ts no-check
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@johnmorrisdotca/tsunagi/element/define";

@Component({
  selector: "app-level",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<tsunagi-board grid="6" level="12"></tsunagi-board>`,
})
export class LevelComponent {}
```

```ts no-check
import "@angular/compiler";
import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { LevelComponent } from "./level.component";

void bootstrapApplication(LevelComponent, { providers: [provideZonelessChangeDetection()] });
```

## Next.js・Nuxt・SvelteKit

先にサーバーで描かれますが、上のインポートはサーバーでも安全なので、コンポーネントはそのまま動きます。Next.js の App Router では、コンポーネントのファイルの先頭に `"use client"` を書きます。
