import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore — módulo JavaScript simples, sem tipos
import { buildServiceWorker } from './scripts/pwa-sw.mjs';

/**
 * D3.3: gera /sw.js no build de produção, com a lista exata dos ficheiros da versão.
 * Sem dependências extra.
 */
function cutsubServiceWorker(): Plugin {
  return {
    name: 'cutsub-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle); // relativos à pasta da app
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: buildServiceWorker({ buildId: Date.now().toString(36), files }),
      });
    },
  };
}

/**
 * Pasta onde a app é publicada.
 * - Local (npm run dev / preview): "/".
 * - GitHub Pages de projeto (https://utilizador.github.io/cutsub/): "/cutsub/".
 *   O workflow .github/workflows/deploy.yml define CUTSUB_BASE automaticamente a partir do nome do repositório.
 */
function basePath(): string {
  const raw = (process.env.CUTSUB_BASE ?? '/').trim() || '/';
  return ('/' + raw.replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');
}

// Porta fixa: tem de coincidir com a "Authorized JavaScript origin" http://localhost:5173 na Google Cloud.
export default defineConfig({
  base: basePath(),
  plugins: [react(), cutsubServiceWorker()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
