import esbuild from "esbuild";
import process from "node:process";

const isProduction = process.env.NODE_ENV === "production";
const isWatch = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: isProduction ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: isProduction,
  drop: isProduction ? ["debugger"] : [],
  // Obsidian expects `module.exports = <plugin class>`, not the __esModule wrapper
  banner: { js: "/* eslint-disable */" },
  footer: {
    js: "module.exports = module.exports.default;",
  },
});

if (isWatch) {
  await context.watch();
} else {
  await context.rebuild();
  process.exit(0);
}
