/**
 * D3.3.1 — Login por REDIRECIONAMENTO (só no Android).
 *
 * Porquê: no PC o login usa uma janela pop-up da Google (Google Identity Services) e funciona.
 * No Android essa "janela" é um separador à parte; o Chrome pode descartar ou recarregar o
 * separador da CutSub (ou reiniciar a app instalada) enquanto escolhes a conta. Quando voltas,
 * a página é nova: o token, que só vive em memória, nunca chega — e a CutSub mostra outra vez
 * "Ligar ao YouTube", sem erro.
 *
 * Solução: no Android, a própria página vai à Google e volta (fluxo oficial "OAuth 2.0 for
 * client-side web applications", response_type=token). Nada depende de a página sobreviver.
 *
 * Segurança:
 * - O token chega no fragmento (#…) do endereço, que nunca é enviado a nenhum servidor; é lido
 *   e APAGADO do endereço de imediato (history.replaceState). Nunca é registado na consola.
 * - "state" aleatório confirma que a resposta é a deste pedido (proteção CSRF).
 * - Só fica em sessionStorage, durante a ida à Google, o "state" e (no cancelamento) o ID do
 *   canal a confirmar. Nunca o token.
 * - Um cancelamento NUNCA é feito automaticamente ao voltar: a confirmação volta a abrir.
 */
import { GOOGLE_CLIENT_ID } from '../config/env';
import { AuthError, type AuthErrorKind } from '../domain/errors';
import { YOUTUBE_READONLY_SCOPE, YOUTUBE_WRITE_SCOPE } from './googleAuth';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const PENDING_KEY = 'cutsub-oauth-pending';
const MAX_AGE_MS = 15 * 60 * 1000;

export type RedirectPurpose = 'login' | 'write';

interface Pending {
  state: string;
  purpose: RedirectPurpose;
  /** Só no cancelamento: canal cuja confirmação volta a abrir. */
  channelId?: string;
  at: number;
}

export type RedirectResult =
  | { ok: true; token: string; expiresAt: number; purpose: RedirectPurpose; channelId?: string }
  | { ok: false; error: AuthError; purpose: RedirectPurpose };

/** Android (telemóvel, tablet e app instalada). O PC continua com a janela pop-up. */
export function prefersRedirectFlow(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

/** Endereço de regresso: a pasta da app (ex.: https://utilizador.github.io/cutsub/). */
export function redirectUri(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Vai à Google. A página sai daqui; ao voltar, consumeRedirectResult() trata a resposta. */
export function startRedirect(purpose: RedirectPurpose, channelId?: string): void {
  if (!GOOGLE_CLIENT_ID) throw new AuthError('config_missing');
  const state = randomState();
  const pending: Pending = { state, purpose, channelId, at: Date.now() };
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    throw new AuthError('unknown');
  }
  // Login: só leitura. Cancelamento: leitura + gestão (um só token serve para as duas coisas).
  const scopes = purpose === 'write' ? [YOUTUBE_READONLY_SCOPE, YOUTUBE_WRITE_SCOPE] : [YOUTUBE_READONLY_SCOPE];
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('include_granted_scopes', 'false');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  window.location.assign(url.toString());
}

const ERROR_KIND: Record<string, AuthErrorKind> = { access_denied: 'denied' };

/**
 * Lê (uma só vez, ao abrir a página) a resposta da Google e apaga-a do endereço.
 * Devolve null se a página não vier de um login por redirecionamento.
 */
export function consumeRedirectResult(): RedirectResult | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !/[#&](access_token|error)=/.test(hash)) return null;

  const params = new URLSearchParams(hash.slice(1));
  // Apaga o token do endereço e do histórico ANTES de qualquer outra coisa.
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);

  let pending: Pending | null = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null');
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    pending = null;
  }

  const purpose = pending?.purpose ?? 'login';
  const fail = (kind: AuthErrorKind): RedirectResult => ({ ok: false, error: new AuthError(kind), purpose });

  if (!pending || pending.state !== params.get('state') || Date.now() - pending.at > MAX_AGE_MS) {
    console.warn('[auth] Resposta da Google ignorada: pedido desconhecido ou expirado.');
    return fail('unknown');
  }

  const error = params.get('error');
  if (error) {
    console.warn('[auth] OAuth (redirecionamento) devolveu erro:', error);
    return fail(ERROR_KIND[error] ?? 'unknown');
  }

  const token = params.get('access_token');
  if (!token) return fail('unknown');

  const granted = (params.get('scope') ?? '').split(/\s+/);
  if (purpose === 'write') {
    // youtube.force-ssl também permite ler a lista: basta este para as duas coisas.
    if (!granted.includes(YOUTUBE_WRITE_SCOPE)) return fail('write_scope_missing');
  } else if (!granted.includes(YOUTUBE_READONLY_SCOPE)) {
    return fail('scope_missing');
  }

  const seconds = Number(params.get('expires_in')) || 3600;
  return { ok: true, token, expiresAt: Date.now() + seconds * 1000, purpose, channelId: pending.channelId };
}
