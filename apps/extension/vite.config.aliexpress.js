// vite.config.aliexpress.js - AliExpress content script bundle.

import { defineConfig } from 'vite';
import { resolve } from 'path';

const ROOT = import.meta.dirname;

export default defineConfig({
  build: {
    lib: {
      entry: resolve(ROOT, 'src/content_scripts/aliexpress.js'),
      name: 'SSAliExpressContentScript',
      formats: ['iife'],
      fileName: () => 'aliexpress.bundle.js',
    },
    outDir: resolve(ROOT, 'build'),
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      treeshake: false,
    },
  },
});
