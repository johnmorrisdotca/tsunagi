// Every way of using the package that the guides show, run against the package as npm packs it: the files in examples/ are copied beside a copy of the packed package
// (.usage/node_modules/@johnmorrisdotca/tsunagi) and each one is built, type-checked or run, and the ones with a page are opened in a browser, which must draw the board. The guides must hold
// these files' text, word for word, so what a reader copies is what was tested.
// `pnpm test:usage` (builds the package and the site first). One browser, one page at a time.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, relative } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";
import { build as esbuild } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const at = (...parts) => join(root, ...parts);
const usage = at(".usage");
const NAME = "@johnmorrisdotca/tsunagi";
const require = createRequire(import.meta.url);

/** Run a program and, if it fails, say what it printed. */
const sh = (program, args, cwd) => {
  try {
    return execFileSync(program, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    throw new Error(`${program} ${args.join(" ")} failed:\n${error.stdout ?? ""}${error.stderr ?? ""}`);
  }
};

// Chromium draws in software, never on the machine's graphics card (a GPU kernel panic on 2026-11-02).
const SOFTWARE_GL_ARGS = [
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
];

const only = process.argv.slice(2);
const results = [];
const failures = [];
const step = async (name, run) => {
  if (only.length > 0 && !only.includes(name)) return;
  const started = Date.now();
  try {
    await run();
    results.push(`ok   ${name} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    results.push(`FAIL ${name}`);
  }
  console.log(results[results.length - 1]);
};

// 1. The package as npm packs it, installed beside the examples.
rmSync(usage, { recursive: true, force: true });
mkdirSync(usage, { recursive: true });
const packed = JSON.parse(
  execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", usage], {
    cwd: root,
    encoding: "utf8",
  }),
);
const tarball = join(usage, packed[0].filename);
const installed = join(usage, "node_modules", "@johnmorrisdotca", "tsunagi");
mkdirSync(installed, { recursive: true });
execFileSync("tar", ["-xzf", tarball, "-C", installed, "--strip-components=1"]);
cpSync(at("examples"), join(usage, "examples"), { recursive: true });
const examples = (name) => join(usage, "examples", name);

// 2. A page that is a folder of built files, served to the browser without a port.
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const serve = async (page, origin, folder, prefix = "") => {
  await page.route(`${origin}${prefix}/**`, (route) => {
    const pathname = new URL(route.request().url()).pathname.slice(prefix.length);
    const file = join(folder, decodeURIComponent(pathname.endsWith("/") ? `${pathname}index.html` : pathname));
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? "application/octet-stream" });
  });
};

let browser;
const opened = async (run) => {
  browser ??= await chromium.launch({ args: SOFTWARE_GL_ARGS });
  const context = await browser.newContext({ viewport: { width: 800, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  try {
    await run(page, errors);
  } finally {
    await context.close();
  }
  if (errors.length > 0) throw new Error(`the page reported errors:\n${errors.join("\n")}`);
};

/** The board is drawn: a <tsunagi-board> whose `.tsu-marble` parts are all there. */
const seesBoard = async (scope) => {
  const parts = scope.locator("tsunagi-board .tsu-marble");
  await parts.nth(4 - 1).waitFor({ state: "attached", timeout: 60_000 });
  if ((await scope.locator("tsunagi-board").count()) !== 1)
    throw new Error("the page should hold exactly one tsunagi-board");
};

/** A CDN's answer: a file of the installed package, under the address the page asks for. */
const cdn = async (page, host, base) => {
  await page.route(`${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file = pathname.startsWith(base) ? join(installed, pathname.slice(base.length)) : "";
    if (file === "" || !existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: "text/javascript" });
  });
};
const showPage = async (page, file) => {
  await page.route("https://page.test/**", (route) =>
    route.fulfill({ body: readFileSync(join(examples(""), file), "utf8"), contentType: "text/html" }),
  );
  await page.goto("https://page.test/");
};

await step("node", () => {
  const out = execFileSync(process.execPath, [join(examples("node"), "server.mjs")], {
    cwd: usage,
    encoding: "utf8",
  }).trim();
  if (!/^\{ ok: true \} 256$/.test(out)) throw new Error(`unexpected output: ${out}`);
});

await step("typescript", async () => {
  writeFileSync(
    join(examples("typescript"), "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "esnext",
        moduleResolution: "bundler",
        strict: true,
        noEmit: true,
        lib: ["es2023", "dom", "dom.iterable"],
        types: [],
        skipLibCheck: true,
      },
      include: ["index.ts"],
    }),
  );
  sh(
    process.execPath,
    [require.resolve("typescript/bin/tsc"), "-p", join(examples("typescript"), "tsconfig.json")],
    usage,
  );
  // The same file, run: its types erased, it is plain JavaScript to Node.
  const out = join(usage, "out", "typescript.mjs");
  await esbuild({
    entryPoints: [join(examples("typescript"), "index.ts")],
    outfile: out,
    format: "esm",
    platform: "node",
    logLevel: "silent",
  });
  const run = execFileSync(process.execPath, [out], {
    cwd: usage,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!/^true 256\n/.test(run)) throw new Error(`unexpected output: ${run}`);
});

await step("cdn-jsdelivr", () =>
  opened(async (page) => {
    await cdn(page, "https://cdn.jsdelivr.net", "/npm/@johnmorrisdotca/tsunagi@1/");
    await showPage(page, "cdn-jsdelivr.html");
    await seesBoard(page);
  }),
);

await step("cdn-unpkg", () =>
  opened(async (page) => {
    await cdn(page, "https://unpkg.com", "/@johnmorrisdotca/tsunagi@1/");
    await showPage(page, "cdn-unpkg.html");
    await seesBoard(page);
  }),
);

await step("iframe", () => {
  if (!existsSync(at("site", "embed", "index.html")))
    throw new Error("site/ is not built: `pnpm test:usage` builds it");
  return opened(async (page) => {
    await serve(page, "https://johnmorrisdotca.github.io", at("site"), "/tsunagi");
    await showPage(page, "iframe.html");
    await seesBoard(page.frameLocator("iframe"));
  });
});

// The bundlers and frameworks: built, then opened.
const { build: viteBuild } = await import("vite");
const viteApp = async (name, plugins = [], configFile = false) => {
  const dir = examples(name);
  const out = join(usage, "out", name);
  await viteBuild({
    root: dir,
    plugins,
    logLevel: "warn",
    build: { outDir: out, emptyOutDir: true },
    base: "./",
    configFile,
  });
  await opened(async (page) => {
    await serve(page, "https://app.test", out);
    await page.goto("https://app.test/");
    await seesBoard(page);
  });
};

await step("vite", () => viteApp("vite"));
await step("react", async () => {
  writeFileSync(
    join(examples("react"), "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "esnext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        lib: ["es2023", "dom", "dom.iterable"],
        skipLibCheck: true,
      },
      include: ["*.tsx", "*.d.ts"],
    }),
  );
  sh(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", join(examples("react"), "tsconfig.json")], usage);
  await viteApp("react");
});
await step("vue", () => viteApp("vue", [], join(examples("vue"), "vite.config.mjs")));
await step("svelte", async () => viteApp("svelte", [(await import("@sveltejs/vite-plugin-svelte")).svelte()]));

await step("react-ssr", async () => {
  const out = join(usage, "out", "ssr-react.mjs");
  await esbuild({
    entryPoints: [join(examples("react"), "ssr.tsx")],
    outfile: out,
    bundle: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    absWorkingDir: root,
    logLevel: "silent",
    external: ["react", "react-dom", "@johnmorrisdotca/tsunagi/*"],
    splitting: false,
  });
  const html = execFileSync(process.execPath, [out], { cwd: usage, encoding: "utf8" });
  if (!html.includes("<tsunagi-board") || !html.includes('grid="6"'))
    throw new Error(`the server render lost the board's tag: ${html.slice(0, 300)}`);
});

await step("webpack", async () => {
  const { default: webpack } = await import("webpack");
  const dir = examples("webpack");
  const config = (await import(pathToFileURL(join(dir, "webpack.config.mjs")).href)).default;
  const out = join(usage, "out", "webpack");
  const stats = await new Promise((resolve, reject) => {
    webpack({ ...config, context: dir, output: { ...config.output, path: out } }, (error, result) =>
      error || !result ? reject(error ?? new Error("no result")) : resolve(result),
    );
  });
  if (stats.hasErrors()) throw new Error(stats.toString({ colors: false, errors: true }));
  writeFileSync(
    join(out, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /></head><body><script src="main.js"></script></body></html>`,
  );
  await opened(async (page) => {
    await serve(page, "https://app.test", out);
    await page.goto("https://app.test/");
    await seesBoard(page);
  });
});

await step("angular", async () => {
  const dir = examples("angular");
  const out = join(usage, "out", "angular");
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "esnext",
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    }),
  );
  await esbuild({
    entryPoints: [join(dir, "main.ts")],
    outdir: out,
    bundle: true,
    splitting: true,
    format: "esm",
    tsconfig: join(dir, "tsconfig.json"),
    absWorkingDir: root,
    logLevel: "silent",
    minify: true,
  });
  writeFileSync(join(out, "index.html"), readFileSync(join(dir, "index.html")));
  await opened(async (page) => {
    await serve(page, "https://app.test", out);
    await page.goto("https://app.test/");
    await seesBoard(page);
  });
});

await browser?.close();

// 3. The guides hold what was tested, word for word.
const everything = only.length === 0;
const guide = (name) => [`docs/guides/${name}.md`, `docs/guides/ja/${name}.md`];
const FILES = {
  "cdn-jsdelivr.html": guide("html-and-cdn"),
  "cdn-unpkg.html": guide("html-and-cdn"),
  "iframe.html": guide("embed-in-an-iframe"),
  "vite/main.ts": guide("bundlers"),
  "vite/index.html": guide("bundlers"),
  "webpack/src/index.js": guide("bundlers"),
  "webpack/webpack.config.mjs": guide("bundlers"),
  "react/Level.tsx": guide("frameworks"),
  "react/tsunagi-board.d.ts": guide("frameworks"),
  "react/main.tsx": guide("frameworks"),
  "vue/Level.vue": guide("frameworks"),
  "vue/main.ts": guide("frameworks"),
  "vue/vite.config.mjs": guide("frameworks"),
  "svelte/Level.svelte": guide("frameworks"),
  "svelte/main.ts": guide("frameworks"),
  "angular/level.component.ts": guide("frameworks"),
  "angular/main.ts": guide("frameworks"),
  "typescript/index.ts": guide("typescript-and-node"),
  "node/server.mjs": guide("typescript-and-node"),
};
const normal = (text) => text.replace(/\r\n/g, "\n").trim();
for (const [file, places] of everything ? Object.entries(FILES) : []) {
  const code = normal(readFileSync(at("examples", file), "utf8"));
  for (const place of places) {
    if (!normal(readFileSync(at(place), "utf8")).includes(code))
      failures.push(`${place} does not hold examples/${file} word for word`);
  }
}
const unlisted = (folder) =>
  readdirSync(at("examples", folder), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? unlisted(join(folder, entry.name))
      : [relative("", join(folder, entry.name)).split("\\").join("/")],
  );
const known = new Set([
  ...Object.keys(FILES),
  "angular/index.html",
  "react/index.html",
  "react/ssr.tsx",
  "svelte/index.html",
  "vue/index.html",
]);
for (const file of everything ? unlisted("") : [])
  if (!known.has(file))
    failures.push(`examples/${file} is not listed in scripts/check-usage.mjs: say where the guides show it`);

console.log(
  failures.length === 0
    ? `\nusage ok: ${results.length} ways to use ${NAME}`
    : `\n${failures.length} failure${failures.length === 1 ? "" : "s"}:\n- ${failures.join("\n- ")}`,
);
if (failures.length > 0) process.exit(1);
