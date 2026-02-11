import esbuild from "esbuild";
import process from "node:process";

const isProduction = process.env.NODE_ENV === "production";
const isWatch = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: isProduction ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: isProduction,
  drop: isProduction ? ["debugger"] : [],
});

if (isWatch) {
  await context.watch();
} else {
  await context.rebuild();
  process.exit(0);
}
