import { useDeferredValue, useMemo, type ReactNode } from 'react';
import { Notice } from '../../components/Notice';
import type { RefreshState } from '../../data/useSubscriptions';
import { API_ERROR_HINTS } from '../../domain/errors';
import { Icon } from '../../components/Icon';
import {
  applyFilters,
  CATEGORY_LABEL,
  CATEGORIES,
  DEFAULT_FILTERS,
  hasActiveFilters,
  PERIODS,
  REVIEW_LABELS_PLURAL,
  type CategoryId,
  type ChannelFilters,
  type ReviewCounts,
  type ReviewedChannel,
} from '../../domain/review';
import { formatNumber } from '../../utils/format';
import type { ChannelCardActions } from './ChannelCard';
import { PeriodFilter, SearchBox, StatusChips } from './ChannelFilters';
import { ChannelList } from './ChannelList';

interface ChannelsScreenProps extends ChannelCardActions {
  items: ReviewedChannel[];
  counts: ReviewCounts;
  suggested: Map<string, CategoryId>;
  filters: ChannelFilters;
  onFiltersChange: (f: ChannelFilters) => void;
  onStartCleanup: (ids: string[], label: string) => void;
  onReload?: () => void;
  /** D3.2.1: estado da atualização manual. */
  refresh?: RefreshState;
  onDismissRefresh?: () => void;
  refreshBlocked?: boolean;
  /** D3.2: contador de cancelamentos (só com dados reais). */
  cancelCounter?: ReactNode;
}

/** Texto curto que descreve os filtros ativos (usado como nome da sessão de limpeza). */
export function describeFilters(f: ChannelFilters): string {
  const parts: string[] = [];
  if (f.category !== 'all') parts.push(CATEGORY_LABEL[f.category]);
  if (f.status !== 'all') parts.push(REVIEW_LABELS_PLURAL[f.status]);
  if (f.period !== 'all') parts.push(`Subscritos: ${PERIODS.find((p) => p.id === f.period)?.label}`);
  if (f.query.trim()) parts.push(`"${f.query.trim()}"`);
  return parts.length ? parts.join(' · ') : 'Todos os canais';
}

export function ChannelsScreen({
  items,
  counts,
  suggested,
  filters,
  onFiltersChange,
  onStartCleanup,
  onReload,
  onStatus,
  onCategory,
  onCancelReal,
  cancelCounter,
  refresh,
  onDismissRefresh,
  refreshBlocked,
}: ChannelsScreenProps) {
  const refreshing = refresh?.phase === 'running';
  // A pesquisa filtra localmente; o valor diferido mantém a escrita fluida com centenas de canais.
  const deferred = useDeferredValue(filters);
  const filtered = useMemo(() => applyFilters(items, deferred), [items, deferred]);
  const active = hasActiveFilters(filters);
  const set = (patch: Partial<ChannelFilters>) => onFiltersChange({ ...filters, ...patch });
  const unreviewedInResult = filtered.filter((it) => it.status === 'unreviewed').length;

  return (
    <section className="section section--flush" aria-labelledby="all-channels">
      <h2 id="all-channels" className="greeting-title mobile-only">
        Os meus canais
      </h2>

      {cancelCounter}

      {/* D3.2: as categorias clicáveis são o único seletor de categoria desta página.
          Mudar de categoria mantém a pesquisa e o filtro de estado. */}
      <div className="category-shortcuts" role="group" aria-label="Categorias">
        <button
          type="button"
          className={filters.category === 'all' ? 'category-shortcut active' : 'category-shortcut'}
          aria-pressed={filters.category === 'all'}
          onClick={() => set({ category: 'all' })}
        >
          Todas ({counts.total})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={filters.category === c.id ? 'category-shortcut active' : 'category-shortcut'}
            aria-pressed={filters.category === c.id}
            onClick={() => set({ category: c.id })}
          >
            {c.label} ({counts.byCategory[c.id]})
          </button>
        ))}
      </div>
      <div className="filters">
        <SearchBox value={filters.query} onChange={(query) => set({ query })} />
        <StatusChips value={filters.status} counts={counts} onChange={(status) => set({ status })} />
        <div className="filters-row">
          <PeriodFilter id="filter-period" value={filters.period} onChange={(period) => set({ period })} />
        </div>
      </div>

      <div className="results-bar">
        <p className="section-count" aria-live="polite">
          {active
            ? `${formatNumber(filtered.length)} de ${formatNumber(items.length)} canais`
            : `${formatNumber(items.length)} ${items.length === 1 ? 'canal' : 'canais'}, por ordem alfabética`}
        </p>
        <div className="results-actions">
          {active && (
            <button type="button" className="link-btn" onClick={() => onFiltersChange(DEFAULT_FILTERS)}>
              Limpar filtros
            </button>
          )}
          {onReload && (
            <button
              type="button"
              className="link-btn"
              onClick={onReload}
              disabled={refreshing || refreshBlocked}
              aria-busy={refreshing}
              title={refreshBlocked ? 'Aguarda o fim do cancelamento em curso' : 'Voltar a pedir a lista ao YouTube'}
            >
              {refreshing ? 'A atualizar…' : 'Atualizar lista'}
            </button>
          )}
        </div>
      </div>

      {refresh && <RefreshStatus refresh={refresh} onDismiss={onDismissRefresh} onRetry={onReload} />}

      {filtered.length > 0 && (
        <button
          type="button"
          className="btn btn--accent btn--block results-cta"
          onClick={() => onStartCleanup(filtered.map((it) => it.channel.id), describeFilters(filters))}
        >
          <Icon name="broom" size={20} />
          {unreviewedInResult > 0
            ? `Analisar ${formatNumber(unreviewedInResult)} ${unreviewedInResult === 1 ? 'canal' : 'canais'} na Limpeza`
            : `Rever estes ${formatNumber(filtered.length)} na Limpeza`}
        </button>
      )}

      {filtered.length === 0 ? (
        <div className="state-card card">
          <span className="state-icon">
            <Icon name="search" size={26} />
          </span>
          <h2 className="state-title">Nenhum canal corresponde aos filtros.</h2>
          <button type="button" className="btn btn--ghost" onClick={() => onFiltersChange(DEFAULT_FILTERS)}>
            Limpar filtros
          </button>
        </div>
      ) : (
        <ChannelList
          items={filtered}
          suggested={suggested}
          onStatus={onStatus}
          onCategory={onCategory}
          onCancelReal={onCancelReal}
          resetKey={JSON.stringify(deferred)}
        />
      )}
    </section>
  );
}

/** D3.2.1: indica claramente quando a atualização está em curso, terminou ou falhou. */
function RefreshStatus({
  refresh,
  onDismiss,
  onRetry,
}: {
  refresh: RefreshState;
  onDismiss?: () => void;
  onRetry?: () => void;
}) {
  if (refresh.phase === 'idle') return null;
  if (refresh.phase === 'running') {
    return (
      <div className="refresh-status" role="status" aria-live="polite">
        <span className="loader-spinner refresh-spinner" aria-hidden="true" />
        <span>
          A atualizar a lista… {formatNumber(refresh.loaded)} canais lidos
          {refresh.pass > 1 && ` (leitura de confirmação ${refresh.pass})`}. A lista atual mantém-se até terminar.
        </span>
      </div>
    );
  }
  if (refresh.phase === 'done') {
    const diff = refresh.count - refresh.previousCount;
    return (
      <div className="refresh-notice">
        <Notice tone="success" title="Lista atualizada" onDismiss={onDismiss}>
          {formatNumber(refresh.count)} subscrições
          {diff !== 0 && ` (${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff))} em relação à lista anterior)`}.
        </Notice>
      </div>
    );
  }
  return (
    <div className="refresh-notice">
      <Notice tone="error" title="A atualização falhou — a lista anterior foi mantida" onDismiss={onDismiss}>
        {API_ERROR_HINTS[refresh.error.kind]}{' '}
        {onRetry && (
          <button type="button" className="text-link" onClick={onRetry}>
            Tentar novamente
          </button>
        )}
      </Notice>
    </div>
  );
}
