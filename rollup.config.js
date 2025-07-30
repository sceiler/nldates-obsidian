import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/main.ts",
  output: {
    dir: ".",
    sourcemap: "inline",
    format: "cjs",
    exports: "default",
  },
  external: ["obsidian"],
  plugins: [
    typescript(),
    nodeResolve({ 
      browser: true,
      preferBuiltins: false,
    }),
    commonjs({
      // Optimize commonjs conversion
      transformMixedEsModules: true,
    }),
  ],
  // Enable tree shaking for better optimization
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false,
  },
};
