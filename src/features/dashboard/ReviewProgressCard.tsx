import { Icon } from '../../components/Icon';
import { percent, REVIEW_LABELS_PLURAL, type ReviewCounts, type ReviewStatus } from '../../domain/review';
import { formatNumber } from '../../utils/format';
import { DECISION_ICON } from '../channels/ReviewControls';
import './dashboard.css';

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
      <span className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
}

const TILES: ReviewStatus[] = ['unreviewed', 'keep', 'maybe', 'remove'];

/** Progresso da limpeza + contadores (clicáveis: abrem a lista filtrada). */
export function ReviewProgressCard({
  counts,
  onShowStatus,
}: {
  counts: ReviewCounts;
  onShowStatus: (status: ReviewStatus) => void;
}) {
  const pct = percent(counts.reviewed, counts.total);
  return (
    <section className="progress-card card" aria-labelledby="progress-title">
      <div className="progress-head">
        <h2 id="progress-title" className="progress-title">
          Progresso da limpeza
        </h2>
        <span className="progress-pct">{pct}%</span>
      </div>
      <p className="progress-sub">
        {formatNumber(counts.reviewed)} de {formatNumber(counts.total)} analisados
      </p>
      <ProgressBar value={pct} label="Canais analisados" />

      <div className="counter-grid">
        {TILES.map((s) => (
          <button key={s} type="button" className={`counter counter--${s}`} onClick={() => onShowStatus(s)}>
            <span className="counter-icon" aria-hidden="true">
              {s === 'unreviewed' ? <span className="counter-dot" /> : <Icon name={DECISION_ICON[s]} size={16} fill="currentColor" />}
            </span>
            <span className="counter-num">{formatNumber(counts[s])}</span>
            <span className="counter-label">{REVIEW_LABELS_PLURAL[s]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
