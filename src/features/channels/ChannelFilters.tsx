import { Icon } from '../../components/Icon';
import {
  CATEGORIES,
  PERIODS,
  REVIEW_LABELS_PLURAL,
  type ChannelFilters,
  type ReviewCounts,
  type ReviewStatus,
} from '../../domain/review';
import { formatNumber } from '../../utils/format';

const STATUS_CHIPS: Array<'all' | ReviewStatus> = ['all', 'unreviewed', 'keep', 'maybe', 'remove'];

/** Botões de decisão que funcionam também como contadores. */
export function StatusChips({
  value,
  counts,
  onChange,
}: {
  value: ChannelFilters['status'];
  counts: ReviewCounts;
  onChange: (status: ChannelFilters['status']) => void;
}) {
  return (
    <div className="status-chips" role="group" aria-label="Filtrar por decisão">
      {STATUS_CHIPS.map((s) => (
        <button
          key={s}
          type="button"
          className={`status-chip status-chip--${s}${value === s ? ' is-active' : ''}`}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          <span className="status-chip-count">{formatNumber(s === 'all' ? counts.total : counts[s])}</span>
          <span className="status-chip-label">{s === 'all' ? 'Total' : REVIEW_LABELS_PLURAL[s]}</span>
        </button>
      ))}
    </div>
  );
}

export function CategoryFilter({
  value,
  counts,
  onChange,
  id,
}: {
  value: ChannelFilters['category'];
  counts: ReviewCounts;
  onChange: (c: ChannelFilters['category']) => void;
  id: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>Categoria</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as ChannelFilters['category'])}>
        <option value="all">Todas ({formatNumber(counts.total)})</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label} ({formatNumber(counts.byCategory[c.id])})
          </option>
        ))}
      </select>
    </div>
  );
}

export function StatusFilter({
  value,
  counts,
  onChange,
  id,
}: {
  value: ChannelFilters['status'];
  counts: ReviewCounts;
  onChange: (s: ChannelFilters['status']) => void;
  id: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>Estado</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as ChannelFilters['status'])}>
        {STATUS_CHIPS.map((s) => (
          <option key={s} value={s}>
            {s === 'all' ? 'Todos' : REVIEW_LABELS_PLURAL[s]} ({formatNumber(s === 'all' ? counts.total : counts[s])})
          </option>
        ))}
      </select>
    </div>
  );
}

export function PeriodFilter({
  value,
  onChange,
  id,
}: {
  value: ChannelFilters['period'];
  onChange: (p: ChannelFilters['period']) => void;
  id: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>Subscrito</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as ChannelFilters['period'])}>
        {PERIODS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  return (
    <div className="search-box">
      <Icon name="search" size={20} />
      <input
        type="search"
        inputMode="search"
        placeholder="Pesquisar canais"
        aria-label="Pesquisar canais por nome ou descrição"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Limpar pesquisa">
          <Icon name="x" size={18} />
        </button>
      )}
    </div>
  );
}
