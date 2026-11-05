/**
 * Leitura e validação das variáveis de ambiente.
 * O Client ID OAuth é público por natureza (não é um segredo).
 * Não existe Client Secret neste projeto.
 */
const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

/** Formato esperado: 1234567890-abc...xyz.apps.googleusercontent.com */
const CLIENT_ID_PATTERN = /^[\w-]+\.apps\.googleusercontent\.com$/;

export const GOOGLE_CLIENT_ID: string | null = CLIENT_ID_PATTERN.test(rawClientId) ? rawClientId : null;

/** Indica se a variável existe mas tem um formato inesperado (ajuda no diagnóstico). */
export const CLIENT_ID_LOOKS_INVALID = rawClientId !== '' && GOOGLE_CLIENT_ID === null;

/** true em `npm run dev`; false no build de produção. */
export const IS_DEV = import.meta.env.DEV;

/**
 * D3.2 — Modo de cancelamento de subscrições.
 * - 'simulated' (por defeito): nada é enviado ao YouTube; a app finge o cancelamento.
 * - 'real': chama subscriptions.delete na YouTube Data API.
 * Só passa a 'real' com VITE_CUTSUB_CANCEL_MODE=real no .env.local.
 */
export const CANCEL_MODE: 'simulated' | 'real' =
  import.meta.env.VITE_CUTSUB_CANCEL_MODE?.trim().toLowerCase() === 'real' ? 'real' : 'simulated';
