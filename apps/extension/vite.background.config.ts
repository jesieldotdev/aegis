import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Service worker MV3: declarado com type: "module", buildado como ESM.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/background.ts'),
      formats: ['es'],
      fileName: () => 'background.js',
    },
  },
});
