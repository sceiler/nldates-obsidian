import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

const isProduction = process.env.NODE_ENV === 'production';

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
    // Add minification for production builds only
    ...(isProduction ? [terser({
      format: {
        comments: false, // Remove comments
      },
      compress: {
        drop_console: false, // Keep console.log for debugging (Obsidian plugins often need this)
        drop_debugger: true, // Remove debugger statements
        passes: 2, // Run compression twice for better results
      },
      mangle: {
        // Preserve function names that might be needed by Obsidian
        keep_fnames: /^(onload|onunload|loadSettings|saveSettings|actionHandler)$/,
        // Preserve class names for Obsidian plugin system
        keep_classnames: true,
      },
    })] : []),
  ],
  // Enable tree shaking for better optimization
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false,
  },
};
