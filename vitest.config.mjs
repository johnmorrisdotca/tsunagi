import { configDefaults,defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "native", exclude: [...configDefaults.exclude,"src/docs-site.test.js"], sequence: { groupOrder: 0 } } },
      // Keep the existing test discovery and deadlines, and measure documentation
      // bundles after native workers finish, with the same size assertions.
      { test: { name: "documentation", include: ["src/docs-site.test.js"], sequence: { groupOrder: 1 } } },
    ],
  },
});
