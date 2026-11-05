import { AuthError } from '../domain/errors';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const LOAD_TIMEOUT_MS = 15_000;

let loading: Promise<void> | null = null;

/** Carrega o script oficial da Google uma única vez. */
export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;

    const fail = (reason: string) => {
      console.error('[auth] Falha ao carregar Google Identity Services:', reason);
      clearTimeout(timer);
      script.remove();
      loading = null; // permite nova tentativa
      reject(new AuthError('gis_unavailable'));
    };

    const timer = setTimeout(() => fail('timeout'), LOAD_TIMEOUT_MS);

    script.onload = () => {
      clearTimeout(timer);
      if (window.google?.accounts?.oauth2) resolve();
      else fail('script carregado sem google.accounts.oauth2');
    };
    script.onerror = () => fail('erro de rede ou script bloqueado');

    document.head.appendChild(script);
  });

  return loading;
}
