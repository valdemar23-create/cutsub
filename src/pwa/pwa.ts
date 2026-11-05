/**
 * D3.3 — Instalação (PWA), atualizações e estado da ligação.
 *
 * - O service worker só é registado no build de produção (npm run build / site publicado).
 * - Uma versão nova nunca se ativa sozinha: a app mostra "Nova versão disponível" e o
 *   utilizador escolhe quando atualizar. As decisões (localStorage) não são afetadas.
 * - Instalar ou atualizar nunca provoca cancelamentos: este módulo não fala com o YouTube.
 */
import { useSyncExternalStore } from 'react';

export interface PwaState {
  /** O browser ofereceu a instalação (Chrome/Edge no Windows e Android). */
  canInstall: boolean;
  /** A app está aberta como app instalada (janela própria). */
  standalone: boolean;
  /** iPhone/iPad no Safari: instala-se pelo menu Partilhar. */
  iosHint: boolean;
  /** Há uma versão nova pronta a ativar. */
  updateReady: boolean;
  offline: boolean;
  /** Acabou de ser instalada nesta sessão. */
  justInstalled: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let state: PwaState = {
  canInstall: false,
  standalone: false,
  iosHint: false,
  updateReady: false,
  offline: false,
  justInstalled: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
let applyingUpdate = false;
let started = false;

export function initPwa(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  set({ standalone: isStandalone(), iosHint: isIos() && !isStandalone(), offline: navigator.onLine === false });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // mostramos o nosso próprio botão "Instalar"
    deferredPrompt = e as BeforeInstallPromptEvent;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    set({ canInstall: false, justInstalled: true });
  });
  window.addEventListener('online', () => set({ offline: false }));
  window.addEventListener('offline', () => set({ offline: true }));
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', () => set({ standalone: isStandalone() }));

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const register = () => {
      navigator.serviceWorker
        // BASE_URL = "/" no computador, "/cutsub/" no GitHub Pages.
        .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' })
        .then((reg) => {
          const track = (worker: ServiceWorker | null) => {
            if (!worker) return;
            const check = () => {
              // Só é "atualização" se já havia uma versão a controlar a página.
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                waitingWorker = worker;
                set({ updateReady: true });
              }
            };
            check();
            worker.addEventListener('statechange', check);
          };
          track(reg.waiting);
          reg.addEventListener('updatefound', () => track(reg.installing));
          // Procurar versões novas ao voltar à app e de hora a hora.
          const lookForUpdate = () => reg.update().catch(() => undefined);
          document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && lookForUpdate());
          setInterval(lookForUpdate, 60 * 60 * 1000);
        })
        .catch((err) => console.warn('[pwa] Não foi possível registar o service worker:', err?.message));

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Só recarrega quando foi o utilizador a pedir a atualização nesta janela.
        if (applyingUpdate) window.location.reload();
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const p = deferredPrompt;
  deferredPrompt = null;
  set({ canInstall: false });
  await p.prompt();
  const choice = await p.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
  return choice.outcome;
}

/** Ativa a versão nova e recarrega. As decisões ficam no localStorage e não são tocadas. */
export function applyUpdate(): void {
  if (!waitingWorker) return;
  applyingUpdate = true;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
