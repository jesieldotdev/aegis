import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      formats: ['iife'],
      name: 'AegisContent',
      fileName: () => 'content.js',
    },
  },
});
