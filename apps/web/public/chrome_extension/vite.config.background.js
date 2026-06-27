import { defineConfig } from 'vite';
import { resolve } from 'path';

const ROOT = import.meta.dirname;

export default defineConfig({
  build: {
    lib: {
      entry: resolve(ROOT, 'background/index.js'),
      name: 'SSBackground',
      formats: ['iife'],
      fileName: () => 'background.bundle.js',
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
