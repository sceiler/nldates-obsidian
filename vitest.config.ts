import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    alias: {
      obsidian: new URL("./src/__mocks__/obsidian.ts", import.meta.url).pathname,
      "obsidian-daily-notes-interface": new URL(
        "./src/__mocks__/obsidian-daily-notes-interface.ts",
        import.meta.url
      ).pathname,
    },
  },
});
