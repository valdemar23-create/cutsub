import { memo } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  DECISIONS,
  REVIEW_LABELS,
  type CategoryId,
  type ReviewStatus,
} from '../../domain/review';

export const DECISION_ICON: Record<Exclude<ReviewStatus, 'unreviewed'>, IconName> = {
  keep: 'heart',
  maybe: 'clock',
  remove: 'trash',
};

/** Escolha de categoria. A opção "Voltar à sugestão" só aparece se a categoria for manual. */
export const CategorySelect = memo(function CategorySelect({
  value,
  isManual,
  suggested,
  onChange,
  className,
}: {
  value: CategoryId;
  isManual: boolean;
  suggested: CategoryId;
  onChange: (category: CategoryId | null) => void;
  className?: string;
}) {
  return (
    <label className={`category-select${isManual ? ' is-manual' : ''} ${className ?? ''}`}>
      <Icon name="tag" size={14} />
      <span className="visually-hidden">Categoria</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === '__auto' ? null : (e.target.value as CategoryId))}
        title={isManual ? 'Categoria escolhida por ti' : 'Categoria sugerida automaticamente — podes alterar'}
      >
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
        {isManual && <option value="__auto">↺ Usar sugestão automática ({CATEGORY_LABEL[suggested]})</option>}
      </select>
      {!isManual && <span className="category-auto" title="Sugestão automática">auto</span>}
    </label>
  );
});

/** Três botões Manter / Talvez / Remover. Carregar no ativo volta a "Não analisado". */
export const DecisionButtons = memo(function DecisionButtons({
  status,
  onChange,
}: {
  status: ReviewStatus;
  onChange: (status: ReviewStatus) => void;
}) {
  return (
    <div className="decision-buttons" role="group" aria-label="Decisão">
      {DECISIONS.map((d) => {
        const active = status === d;
        return (
          <button
            key={d}
            type="button"
            className={`decision-btn decision-btn--${d}${active ? ' is-active' : ''}`}
            aria-pressed={active}
            title={active ? `Desmarcar (voltar a "${REVIEW_LABELS.unreviewed}")` : REVIEW_LABELS[d]}
            onClick={() => onChange(active ? 'unreviewed' : d)}
          >
            <Icon name={DECISION_ICON[d]} size={16} fill={active ? 'currentColor' : 'none'} />
            {REVIEW_LABELS[d]}
          </button>
        );
      })}
    </div>
  );
});

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{REVIEW_LABELS[status]}</span>;
}
