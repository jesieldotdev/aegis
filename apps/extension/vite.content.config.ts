import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Content script: declarado no manifest como script clássico (não-módulo),
// então precisa ser um bundle IIFE autossuficiente, sem imports em runtime.
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
