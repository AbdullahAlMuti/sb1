// vite.config.js — suppliers bundle (B1).
// Entry: suppliers/index.js → build/suppliers.bundle.js
// Standalone supplier plugin registry, used by Walmart + future supplier scripts.
//
// Run: npm run build:suppliers  OR  npm run build (builds all bundles)

import { defineConfig } from 'vite';
import { resolve } from 'path';

const ROOT = import.meta.dirname;

export default defineConfig({
  build: {
    lib: {
      entry: resolve(ROOT, 'suppliers/index.js'),
      name: 'SSSuppliers',
      formats: ['iife'],
      fileName: () => 'suppliers.bundle.js',
    },
    outDir: resolve(ROOT, 'build'),
    emptyOutDir: true, // clean build/ at start of full build sequence
    minify: false,
    sourcemap: true,
    rollupOptions: {
      treeshake: false,
    },
  },
});
