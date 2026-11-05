/**
 * Wrapper da Google Identity Services (modelo de token, sem backend).
 *
 * - O login pede apenas o scope youtube.readonly.
 * - D3.2: o scope de escrita (youtube.force-ssl) só é pedido no momento do primeiro
 *   cancelamento real, num token separado que vive só em memória.
 * - O access token nunca é guardado em localStorage, cookies ou logs.
 * - Não existe Client Secret: o fluxo para browser não o usa.
 */
import { GOOGLE_CLIENT_ID } from '../config/env';
import { AuthError } from '../domain/errors';
import { loadGis } from './loadGis';

export const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
/**
 * Menor privilégio possível para subscriptions.delete: a API aceita apenas
 * youtube, youtube.force-ssl ou youtubepartner. Não existe um scope só de "cancelar subscrições".
 */
export const YOUTUBE_WRITE_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';

export interface AccessToken {
  value: string;
  /** Momento (ms desde epoch) em que o token deixa de ser válido. */
  expiresAt: number;
}

type Pending = { resolve: (t: AccessToken) => void; reject: (e: AuthError) => void };

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let preparing: Promise<void> | null = null;
let pending: Pending | null = null;

function settle(fn: (p: Pending) => void) {
  const p = pending;
  pending = null;
  if (p) fn(p);
}

function handleTokenResponse(response: google.accounts.oauth2.TokenResponse) {
  if (response.error) {
    console.warn('[auth] OAuth devolveu erro:', response.error, response.error_description ?? '');
    settle((p) => p.reject(new AuthError(response.error === 'access_denied' ? 'denied' : 'unknown')));
    return;
  }

  // Com consentimento granular, o utilizador pode desmarcar o scope.
  if (!google.accounts.oauth2.hasGrantedAllScopes(response, YOUTUBE_READONLY_SCOPE)) {
    console.warn('[auth] Scope youtube.readonly não concedido.');
    revokeToken(response.access_token);
    settle((p) => p.reject(new AuthError('scope_missing')));
    return;
  }

  const seconds = Number(response.expires_in) || 3600;
  settle((p) => p.resolve({ value: response.access_token, expiresAt: Date.now() + seconds * 1000 }));
}

function handleClientError(error: google.accounts.oauth2.ClientConfigError) {
  console.warn('[auth] Erro na janela da Google:', error.type, error.message ?? '');
  const kind =
    error.type === 'popup_closed' ? 'popup_closed' : error.type === 'popup_failed_to_open' ? 'popup_blocked' : 'unknown';
  settle((p) => p.reject(new AuthError(kind)));
}

/**
 * Carrega a biblioteca e prepara o cliente. Deve ser chamado cedo (ao abrir a app),
 * para que o clique em "Ligar" abra o popup de imediato e o browser não o bloqueie.
 */
export function prepareGoogleAuth(): Promise<void> {
  if (tokenClient) return Promise.resolve();
  if (!GOOGLE_CLIENT_ID) return Promise.reject(new AuthError('config_missing'));
  const clientId = GOOGLE_CLIENT_ID;
  preparing ??= loadGis()
    .then(() => initClient(clientId))
    .finally(() => {
      preparing = null;
    });
  return preparing;
}

/* ---------- Token de escrita (D3.2) ---------- */

let writeClient: google.accounts.oauth2.TokenClient | null = null;
let writePending: Pending | null = null;

function settleWrite(fn: (p: Pending) => void) {
  const p = writePending;
  writePending = null;
  if (p) fn(p);
}

function handleWriteResponse(response: google.accounts.oauth2.TokenResponse) {
  if (response.error) {
    console.warn('[auth] OAuth (escrita) devolveu erro:', response.error, response.error_description ?? '');
    settleWrite((p) => p.reject(new AuthError(response.error === 'access_denied' ? 'denied' : 'unknown')));
    return;
  }
  if (!google.accounts.oauth2.hasGrantedAllScopes(response, YOUTUBE_WRITE_SCOPE)) {
    console.warn('[auth] Permissão de gestão do YouTube não concedida.');
    revokeToken(response.access_token);
    settleWrite((p) => p.reject(new AuthError('write_scope_missing')));
    return;
  }
  const seconds = Number(response.expires_in) || 3600;
  settleWrite((p) => p.resolve({ value: response.access_token, expiresAt: Date.now() + seconds * 1000 }));
}

function handleWriteError(error: google.accounts.oauth2.ClientConfigError) {
  console.warn('[auth] Erro na janela da Google (escrita):', error.type, error.message ?? '');
  const kind =
    error.type === 'popup_closed' ? 'popup_closed' : error.type === 'popup_failed_to_open' ? 'popup_blocked' : 'unknown';
  settleWrite((p) => p.reject(new AuthError(kind)));
}

/**
 * Pede o token de escrita. Tem de ser chamado diretamente no clique de confirmação
 * (de forma síncrona), senão o browser pode bloquear a janela da Google.
 */
export function requestWriteToken(): Promise<AccessToken> {
  if (!writeClient) return Promise.reject(new AuthError('gis_unavailable'));
  settleWrite((p) => p.reject(new AuthError('popup_closed')));
  return new Promise<AccessToken>((resolve, reject) => {
    writePending = { resolve, reject };
    writeClient!.requestAccessToken();
  });
}

function initClient(clientId: string) {
  writeClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: YOUTUBE_WRITE_SCOPE,
    include_granted_scopes: false,
    callback: handleWriteResponse,
    error_callback: handleWriteError,
  });
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: YOUTUBE_READONLY_SCOPE,
    // Fase 1: o token contém apenas leitura, mesmo que no futuro existam outros scopes concedidos.
    include_granted_scopes: false,
    callback: handleTokenResponse,
    error_callback: handleClientError,
  });
}

/**
 * Abre o popup oficial da Google. Tem de ser chamado diretamente no clique
 * (de forma síncrona), senão o browser pode bloquear a janela.
 */
export function requestAccessToken(): Promise<AccessToken> {
  if (!tokenClient) return Promise.reject(new AuthError('gis_unavailable'));

  // Um pedido anterior ainda pendente é dado como abandonado.
  settle((p) => p.reject(new AuthError('popup_closed')));

  return new Promise<AccessToken>((resolve, reject) => {
    pending = { resolve, reject };
    tokenClient!.requestAccessToken();
  });
}

/** Revoga o token junto da Google. Nunca lança erro: terminar sessão tem sempre de funcionar. */
export function revokeToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.google?.accounts?.oauth2) return resolve();
    const timer = setTimeout(resolve, 5000);
    try {
      google.accounts.oauth2.revoke(token, (r) => {
        if (r && !r.successful) console.warn('[auth] Revogação não confirmada:', r.error ?? '');
        clearTimeout(timer);
        resolve();
      });
    } catch (err) {
      console.warn('[auth] Erro ao revogar:', err);
      clearTimeout(timer);
      resolve();
    }
  });
}
