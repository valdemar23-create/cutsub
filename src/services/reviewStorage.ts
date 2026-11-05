/**
 * Persistência LOCAL das decisões de organização (localStorage).
 *
 * Guarda APENAS, por channelId:
 *   - s: decisão (keep | maybe | remove) — "Não analisado" não é guardado;
 *   - c: categoria escolhida manualmente.
 *
 * NUNCA guarda tokens, dados de autenticação, nomes ou descrições de canais.
 * Formato: { "v": 1, "channels": { "UCxxxx": { "s": "keep", "c": "photo" } } }
 */
import { isCategoryId, type ReviewEntry } from '../domain/review';

export const REVIEW_STORAGE_KEY = 'mytube-cleaner-review-v1';
/** Chave separada para o modo DEMO, para não misturar canais fictícios com reais. */
export const DEMO_REVIEW_STORAGE_KEY = 'mytube-cleaner-review-demo-v1';

const VERSION = 1;
const DECISION_VALUES = new Set(['keep', 'maybe', 'remove']);

export type ReviewMap = Record<string, ReviewEntry>;

interface StoredEntry {
  s?: string;
  c?: string;
}

/**
 * Valida dados no formato guardado ({ v: 1, channels: {...} }).
 * Devolve null se o formato não for reconhecido. Entradas inválidas são ignoradas.
 */
export function parseStoredReviews(data: unknown): ReviewMap | null {
  const d = data as { v?: number; channels?: Record<string, StoredEntry> } | null;
  if (!d || d.v !== VERSION || typeof d.channels !== 'object' || d.channels === null || Array.isArray(d.channels)) {
    return null;
  }
  const result: ReviewMap = {};
  for (const [channelId, e] of Object.entries(d.channels)) {
    if (typeof channelId !== 'string' || channelId.length > 64 || !e || typeof e !== 'object') continue;
    const entry: ReviewEntry = {};
    if (typeof e.s === 'string' && DECISION_VALUES.has(e.s)) entry.status = e.s as ReviewEntry['status'];
    if (isCategoryId(e.c)) entry.category = e.c;
    if (entry.status || entry.category) result[channelId] = entry;
  }
  return result;
}

export function serializeReviews(reviews: ReviewMap): { v: number; channels: Record<string, StoredEntry> } {
  const channels: Record<string, StoredEntry> = {};
  for (const [channelId, entry] of Object.entries(reviews)) {
    const stored: StoredEntry = {};
    if (entry.status) stored.s = entry.status;
    if (entry.category) stored.c = entry.category;
    if (stored.s || stored.c) channels[channelId] = stored;
  }
  return { v: VERSION, channels };
}

export function loadReviews(key: string): ReviewMap {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return parseStoredReviews(JSON.parse(raw)) ?? {};
  } catch (err) {
    // Dados corrompidos ou armazenamento indisponível: começa vazio, sem rebentar a app.
    console.warn('[review] Não foi possível ler as decisões guardadas:', (err as Error)?.message);
    return {};
  }
}

export function saveReviews(key: string, reviews: ReviewMap): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(serializeReviews(reviews)));
    return true;
  } catch (err) {
    console.warn('[review] Não foi possível guardar as decisões:', (err as Error)?.message);
    return false;
  }
}
