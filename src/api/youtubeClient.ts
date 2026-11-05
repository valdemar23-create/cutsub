/**
 * Cliente mínimo da YouTube Data API v3.
 *
 * - Autenticação apenas pelo cabeçalho Authorization (nunca na URL, nunca API Key).
 * - Traduz respostas HTTP de erro para ApiError (com mensagens amigáveis na UI).
 * - Pedidos GET (leitura) e, desde a D3.2, um único DELETE: youtubeDelete, usado só
 *   por api/cancelSubscription.ts depois de confirmação explícita do utilizador.
 */
import { ApiError, type ApiErrorKind } from '../domain/errors';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

const QUOTA_REASONS = new Set(['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded', 'userRateLimitExceeded']);
const DISABLED_REASONS = new Set(['accessNotConfigured', 'SERVICE_DISABLED']);

type Params = Record<string, string | undefined>;

/** Extrai os "reasons" do corpo de erro da Google (sem nada sensível). */
async function readReasons(res: Response): Promise<string[]> {
  try {
    const body = await res.json();
    const err = body?.error ?? {};
    const reasons = [
      ...(Array.isArray(err.errors) ? err.errors.map((e: { reason?: string }) => e?.reason) : []),
      ...(Array.isArray(err.details) ? err.details.map((d: { reason?: string }) => d?.reason) : []),
    ];
    return reasons.filter((r): r is string => typeof r === 'string' && r.length > 0);
  } catch {
    return [];
  }
}

function classify(status: number, reasons: string[]): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 429 || reasons.some((r) => QUOTA_REASONS.has(r))) return 'quota';
  if (status === 403) return reasons.some((r) => DISABLED_REASONS.has(r)) ? 'api_disabled' : 'forbidden';
  if (status === 404) return 'no_channel';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** GET autenticado. Lança ApiError em caso de falha; AbortError é propagado tal como está. */
export async function youtubeGet<T>(path: string, params: Params, token: string, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal,
      // Sem cookies nem cache partilhada: os dados ficam só na memória da app.
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    console.error('[youtube] Pedido falhou antes de chegar ao servidor:', (err as Error)?.message);
    throw new ApiError('network');
  }

  if (!res.ok) {
    const reasons = await readReasons(res);
    const error = new ApiError(classify(res.status, reasons), res.status, reasons);
    // Só código e motivos: nunca a URL completa nem cabeçalhos.
    console.error(`[youtube] ${path}: HTTP ${res.status}`, reasons.join(', ') || '(sem motivo)');
    throw error;
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError('unknown', res.status, ['invalidJson']);
  }
}

/**
 * DELETE autenticado (D3.2). Usado apenas para cancelar UMA subscrição de cada vez.
 * Sucesso = HTTP 204. Lança ApiError em caso de falha.
 */
export async function youtubeDelete(path: string, params: Params, token: string): Promise<void> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[youtube] DELETE falhou antes de chegar ao servidor:', (err as Error)?.message);
    throw new ApiError('network');
  }

  if (res.status === 204 || res.ok) return;

  const reasons = await readReasons(res);
  const kind = res.status === 404 ? 'subscription_not_found' : classify(res.status, reasons);
  console.error(`[youtube] DELETE ${path}: HTTP ${res.status}`, reasons.join(', ') || '(sem motivo)');
  throw new ApiError(kind, res.status, reasons);
}
