// vite.config.amazon.js — Amazon content script bundle (B2).
// Entry: src/content_scripts/amazon.js → build/amazon.bundle.js
// Bundles all 28 Amazon document_idle content script files into one IIFE.
// Replaces the 28-entry manifest list with a single file.
//
// Run: npm run build:amazon  OR  npm run build (builds all bundles)
// Note: run AFTER build:suppliers so build/ is already initialised (emptyOutDir: false).

import { defineConfig } from 'vite';
import { resolve } from 'path';

const ROOT = import.meta.dirname;

export default defineConfig({
  build: {
    lib: {
      entry: resolve(ROOT, 'src/content_scripts/amazon.js'),
      name: 'SSAmazonContentScript',
      formats: ['iife'],
      fileName: () => 'amazon.bundle.js',
    },
    outDir: resolve(ROOT, 'build'),
    emptyOutDir: false, // suppliers.bundle.js already in build/ — don't wipe it
    minify: false,
    sourcemap: true,
    rollupOptions: {
      treeshake: false,
    },
  },
});
