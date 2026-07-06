import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Serve páginas estáticas em public/<rota>/index.html no dev server (ex.:
 * /privacidade, /termos). Sem isso, o fallback SPA do Vite entregaria o
 * index.html do app. Em produção o nginx já cobre esses caminhos.
 */
function staticPages(): Plugin {
  const publicDir = fileURLToPath(new URL('./public', import.meta.url));
  return {
    name: 'aegis-static-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0].replace(/\/+$/, '');
        if (!pathname) return next();
        const file = resolve(publicDir, `.${pathname}`, 'index.html');
        if (file.startsWith(publicDir) && existsSync(file)) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(readFileSync(file));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), staticPages()],
  server: {
    port: 5173,
  },
});
