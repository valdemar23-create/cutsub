/**
 * Backup das decisões locais (D3.2).
 *
 * O ficheiro contém APENAS o que já está no localStorage (chave mytube-cleaner-review-v1):
 * por channelId, a decisão e a categoria manual. Nunca contém tokens, nomes de canais,
 * descrições ou outros dados da conta.
 */
import type { ReviewMap } from './reviewStorage';
import { DEMO_REVIEW_STORAGE_KEY, parseStoredReviews, REVIEW_STORAGE_KEY, serializeReviews } from './reviewStorage';

const APP = 'cutsub';
const TYPE = 'review-backup';
const VERSION = 1;
const MAX_BYTES = 5 * 1024 * 1024;

export type StorageMode = 'real' | 'demo';

export interface BackupFile {
  app: typeof APP;
  type: typeof TYPE;
  version: typeof VERSION;
  mode: StorageMode;
  storageKey: string;
  exportedAt: string;
  data: ReturnType<typeof serializeReviews>;
}

export interface BackupSummary {
  total: number;
  keep: number;
  maybe: number;
  remove: number;
  manualCategories: number;
}

export function summarize(reviews: ReviewMap): BackupSummary {
  const s = { total: 0, keep: 0, maybe: 0, remove: 0, manualCategories: 0 };
  for (const e of Object.values(reviews)) {
    s.total += 1;
    if (e.status) s[e.status] += 1;
    if (e.category) s.manualCategories += 1;
  }
  return s;
}

export function buildBackup(reviews: ReviewMap, mode: StorageMode, now = new Date()): BackupFile {
  return {
    app: APP,
    type: TYPE,
    version: VERSION,
    mode,
    storageKey: mode === 'demo' ? DEMO_REVIEW_STORAGE_KEY : REVIEW_STORAGE_KEY,
    exportedAt: now.toISOString(),
    data: serializeReviews(reviews),
  };
}

export function backupFilename(mode: StorageMode, now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `cutsub-backup${mode === 'demo' ? '-demo' : ''}-${stamp}.json`;
}

export type ParsedBackup =
  | { ok: true; reviews: ReviewMap; exportedAt: string | null; summary: BackupSummary }
  | { ok: false; error: string };

/** Valida um ficheiro de backup antes de qualquer substituição. */
export function parseBackup(text: string, expectedMode: StorageMode): ParsedBackup {
  if (text.length > MAX_BYTES) return { ok: false, error: 'O ficheiro é demasiado grande para ser um backup da CutSub.' };

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O ficheiro não é um JSON válido.' };
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, error: 'Este ficheiro não é um backup da CutSub.' };
  }

  const file = json as Partial<BackupFile>;
  if (file.app !== APP || file.type !== TYPE) return { ok: false, error: 'Este ficheiro não é um backup da CutSub.' };
  if (file.version !== VERSION) return { ok: false, error: 'Versão de backup não suportada por esta versão da CutSub.' };
  if (file.mode !== expectedMode) {
    return {
      ok: false,
      error:
        file.mode === 'demo'
          ? 'Este backup é do modo DEMO (canais fictícios) e não pode substituir as decisões dos teus canais reais.'
          : 'Este backup é dos teus canais reais e não pode ser importado no modo DEMO.',
    };
  }

  const reviews = parseStoredReviews(file.data);
  if (!reviews) return { ok: false, error: 'Os dados do backup não estão num formato reconhecido.' };

  const exportedAt = typeof file.exportedAt === 'string' && !Number.isNaN(Date.parse(file.exportedAt)) ? file.exportedAt : null;
  return { ok: true, reviews, exportedAt, summary: summarize(reviews) };
}
