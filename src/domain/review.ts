/**
 * Modelo de organização/limpeza (Etapa D).
 * Tudo aqui é LOCAL: nenhuma decisão altera o YouTube.
 */
import type { Channel } from './channel';

/* ---------- Decisões ---------- */

export type ReviewStatus = 'unreviewed' | 'keep' | 'maybe' | 'remove';

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  unreviewed: 'Não analisado',
  keep: 'Manter',
  maybe: 'Talvez',
  remove: 'Remover',
};

/** Rótulos no plural, para filtros e contadores. */
export const REVIEW_LABELS_PLURAL: Record<ReviewStatus, string> = {
  unreviewed: 'Não analisados',
  keep: 'Manter',
  maybe: 'Talvez',
  remove: 'Remover',
};

export const DECISIONS: ReadonlyArray<Exclude<ReviewStatus, 'unreviewed'>> = ['keep', 'maybe', 'remove'];

/* ---------- Categorias ---------- */

export const CATEGORIES = [
  { id: 'tech', label: 'Tecnologia' },
  { id: 'photo', label: 'Fotografia' },
  { id: 'travel', label: 'Viagens' },
  { id: 'outdoors', label: 'Outdoor & Natureza' },
  { id: 'finance', label: 'Finanças' },
  { id: 'music', label: 'Música' },
  { id: 'news', label: 'Notícias & Atualidade' },
  { id: 'politics', label: 'Política' },
  { id: 'sports', label: 'Desporto' },
  { id: 'education', label: 'Educação & Tutoriais' },
  { id: 'entertainment', label: 'Entretenimento' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'cars', label: 'Automóveis' },
  { id: 'cooking', label: 'Culinária' },
  { id: 'health', label: 'Saúde & Bem-estar' },
  { id: 'home', label: 'Casa & DIY' },
  { id: 'religion', label: 'Espiritualidade & Religião' },
  { id: 'vlogs', label: 'Vlogs & Lifestyle' },
  { id: 'immigration', label: 'Imigração & Vida no Exterior' },
  { id: 'other', label: 'Outros' },
  { id: 'unclassified', label: 'Por classificar' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<CategoryId, string>;

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && value in CATEGORY_LABEL;
}

/* ---------- Canal + decisão + categoria ---------- */

/** O que fica guardado por channelId (só o que difere do valor por defeito). */
export interface ReviewEntry {
  status?: Exclude<ReviewStatus, 'unreviewed'>;
  /** Categoria escolhida manualmente: tem sempre prioridade sobre a automática. */
  category?: CategoryId;
}

export interface ReviewedChannel {
  channel: Channel;
  status: ReviewStatus;
  category: CategoryId;
  categoryIsManual: boolean;
}

/* ---------- Antiguidade da subscrição ---------- */

export const PERIODS = [
  { id: 'all', label: 'Todas' },
  { id: 'pre2020', label: 'Antes de 2020' },
  { id: '2020-2022', label: '2020–2022' },
  { id: '2023-2024', label: '2023–2024' },
  { id: '2025+', label: '2025–atual' },
] as const;

export type PeriodId = (typeof PERIODS)[number]['id'];

function inPeriod(iso: string | undefined, period: PeriodId): boolean {
  if (period === 'all') return true;
  const year = iso ? new Date(iso).getFullYear() : NaN;
  if (Number.isNaN(year)) return false;
  switch (period) {
    case 'pre2020':
      return year < 2020;
    case '2020-2022':
      return year >= 2020 && year <= 2022;
    case '2023-2024':
      return year >= 2023 && year <= 2024;
    case '2025+':
      return year >= 2025;
  }
}

/* ---------- Filtros ---------- */

export interface ChannelFilters {
  query: string;
  status: 'all' | ReviewStatus;
  category: 'all' | CategoryId;
  period: PeriodId;
}

export const DEFAULT_FILTERS: ChannelFilters = { query: '', status: 'all', category: 'all', period: 'all' };

export function hasActiveFilters(f: ChannelFilters): boolean {
  return f.query.trim() !== '' || f.status !== 'all' || f.category !== 'all' || f.period !== 'all';
}

/** Minúsculas e sem acentos, para pesquisa tolerante ("musica" encontra "Música"). */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Filtra localmente (sem pedidos à API). Todos os termos da pesquisa têm de aparecer no nome ou na descrição. */
export function applyFilters(items: ReviewedChannel[], f: ChannelFilters): ReviewedChannel[] {
  const terms = normalizeText(f.query).split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    if (f.status !== 'all' && it.status !== f.status) return false;
    if (f.category !== 'all' && it.category !== f.category) return false;
    if (!inPeriod(it.channel.subscribedAt, f.period)) return false;
    if (terms.length) {
      const haystack = normalizeText(`${it.channel.title} ${it.channel.description ?? ''}`);
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

/* ---------- Contadores ---------- */

export interface ReviewCounts {
  total: number;
  unreviewed: number;
  keep: number;
  maybe: number;
  remove: number;
  reviewed: number;
  byCategory: Record<CategoryId, number>;
}

export function countReviews(items: ReviewedChannel[]): ReviewCounts {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<CategoryId, number>;
  const counts = { unreviewed: 0, keep: 0, maybe: 0, remove: 0 };
  for (const it of items) {
    counts[it.status] += 1;
    byCategory[it.category] += 1;
  }
  return { total: items.length, ...counts, reviewed: counts.keep + counts.maybe + counts.remove, byCategory };
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
