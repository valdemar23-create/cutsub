import { DemoBadge } from '../../components/DemoBadge';
import { Icon } from '../../components/Icon';
import { formatNumber } from '../../utils/format';
import './dashboard.css';

interface SummaryCardProps {
  total: number;
  unreviewed: number;
  isDemo: boolean;
  /** Há uma sessão de limpeza a meio. */
  sessionActive: boolean;
  onStartCleanup: () => void;
}

/** Cartão principal: total de canais + "Começar limpeza". */
export function SummaryCard({ total, unreviewed, isDemo, sessionActive, onStartCleanup }: SummaryCardProps) {
  return (
    <section className="summary card" aria-labelledby="summary-total">
      <div className="summary-top">
        <div>
          <p id="summary-total" className="summary-number">
            {formatNumber(total)}
          </p>
          <p className="summary-caption">{total === 1 ? 'canal subscrito' : 'canais subscritos'}</p>
        </div>
        <div className="summary-mark" aria-hidden="true">
          <Icon name="users" size={30} />
        </div>
      </div>
      {isDemo && (
        <p className="summary-demo">
          <DemoBadge /> Número fictício. Na Etapa C passa a ser o teu total real.
        </p>
      )}

      <button type="button" className="btn btn--accent btn--lg btn--block" onClick={onStartCleanup} disabled={total === 0}>
        <Icon name="broom" size={22} />
        {sessionActive ? 'Continuar limpeza' : 'Começar limpeza'}
        <Icon name="chevronRight" size={20} />
      </button>
      <p className="summary-soon">
        {unreviewed === 0 && total > 0
          ? 'Todos os canais foram analisados'
          : `${formatNumber(unreviewed)} ${unreviewed === 1 ? 'canal' : 'canais'} por analisar`}
      </p>
    </section>
  );
}
