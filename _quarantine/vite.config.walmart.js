// vite.config.walmart.js — Walmart content script bundle (B3).
// Entry: src/content_scripts/walmart.js → build/walmart.bundle.js
// Bundles all 20 Walmart document_idle content script files into one IIFE.
// Replaces the 20-entry manifest list with a single file.
//
// Run: npm run build:walmart  OR  npm run build (builds all bundles)
// Note: run AFTER build:suppliers so build/ is already initialised (emptyOutDir: false).

import { defineConfig } from 'vite';
import { resolve } from 'path';

const ROOT = import.meta.dirname;

export default defineConfig({
  build: {
    lib: {
      entry: resolve(ROOT, 'src/content_scripts/walmart.js'),
      name: 'SSWalmartContentScript',
      formats: ['iife'],
      fileName: () => 'walmart.bundle.js',
    },
    outDir: resolve(ROOT, 'build'),
    emptyOutDir: false, // suppliers.bundle.js and amazon.bundle.js already in build/ — don't wipe
    minify: false,
    sourcemap: true,
    rollupOptions: {
      treeshake: false,
    },
  },
});
