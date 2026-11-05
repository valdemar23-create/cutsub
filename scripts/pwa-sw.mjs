/**
 * Gera o service worker da CutSub (D3.3). Usado pelo build (vite.config.ts).
 *
 * O service worker guarda APENAS recursos estáticos da própria app (HTML, JS, CSS, ícones).
 * Nunca guarda nem interceta pedidos à Google / YouTube API: sem internet, a app abre,
 * mas não consegue entrar, consultar nem cancelar subscrições.
 * Não toca no localStorage (onde ficam as decisões).
 */

/** Caminhos RELATIVOS à pasta da app (funciona em "/" e em subpastas, ex.: GitHub Pages "/cutsub/"). */
const STATIC_FILES = [
  '',
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

/** @param {{ buildId: string, files: string[] }} opts  files: caminhos relativos (ex.: "assets/index-abc.js") */
export function buildServiceWorker({ buildId, files }) {
  const rel = files.map((f) => f.replace(/^\/+/, ''));
  const precache = [...new Set([...STATIC_FILES, ...rel])].filter((f) => f !== 'sw.js' && !f.endsWith('.map'));
  return `/* CutSub service worker — gerado automaticamente no build ${buildId}. Não editar. */
// Pasta onde a app está publicada (ex.: "/" ou "/cutsub/"), calculada a partir do próprio sw.js.
const BASE = new URL('./', self.location).pathname;
const CACHE = 'cutsub-static-${buildId}';
const PRECACHE = ${JSON.stringify(precache)}.map((f) => BASE + f);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined))),
    ),
  );
  // Não ativa sozinho: a app mostra "Nova versão disponível" e o utilizador decide quando atualizar.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cutsub-static-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Só a própria app. Google, YouTube API e miniaturas passam sempre direto à rede.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE) || url.pathname === BASE + 'sw.js') return;

  if (req.mode === 'navigate') {
    // Página: rede primeiro (para receber sempre a versão mais recente); sem rede, a cópia guardada.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(BASE, copy));
          }
          return res;
        })
        .catch(() => caches.match(BASE).then((r) => r || caches.match(BASE + 'index.html'))),
    );
    return;
  }

  if (url.pathname.startsWith(BASE + 'assets/')) {
    // Ficheiros com hash no nome: nunca mudam → cache primeiro.
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Restantes (ícones, manifesto…): devolve a cópia e atualiza em segundo plano.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
`;
}
