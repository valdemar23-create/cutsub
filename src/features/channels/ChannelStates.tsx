import { IS_DEV } from '../../config/env';
import { Icon } from '../../components/Icon';
import { API_ERROR_HINTS, type ApiError } from '../../domain/errors';

/** Erro ao carregar: mensagem amigável + tentar novamente (sem novo login). */
export function SubscriptionsError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="state-card card" role="alert">
      <span className="state-icon state-icon--error">
        <Icon name="info" size={26} />
      </span>
      <h2 className="state-title">Não foi possível carregar as tuas subscrições.</h2>
      <p className="state-text">{API_ERROR_HINTS[error.kind]}</p>
      {IS_DEV && (
        <p className="state-dev">
          Detalhe técnico (só em desenvolvimento): HTTP {error.status || '—'}
          {error.reasons.length > 0 && ` · ${error.reasons.join(', ')}`}
        </p>
      )}
      <button type="button" className="btn btn--accent" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}

/** Conta sem subscrições. */
export function SubscriptionsEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="state-card card">
      <span className="state-icon">
        <Icon name="users" size={26} />
      </span>
      <h2 className="state-title">A tua conta não tem subscrições para mostrar.</h2>
      <p className="state-text">
        Se tens mais do que um canal do YouTube, confirma que escolheste o canal certo ao entrar.
      </p>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Atualizar
        </button>
      )}
    </div>
  );
}
