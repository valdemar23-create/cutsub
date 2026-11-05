import { useEffect, useRef } from 'react';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { ApiError, AUTH_MESSAGES, CANCEL_ERROR_MESSAGES } from '../../domain/errors';
import type { CancellationApi } from './useCancellation';
import './cancel.css';

/** Confirmação explícita antes de cancelar UMA subscrição no YouTube. */
export function CancelDialog({ api }: { api: CancellationApi }) {
  const { state, mode, close, confirm } = api;
  const keepRef = useRef<HTMLButtonElement>(null);
  const open = state.phase !== 'idle';

  // Foco inicial no botão seguro ("Não, manter"); Esc fecha (exceto a meio do pedido).
  useEffect(() => {
    if (!open) return;
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;
  const { channel } = state;
  const working = state.phase === 'working';
  const error = state.phase === 'error' ? state.error : null;
  const message = error
    ? error instanceof ApiError
      ? CANCEL_ERROR_MESSAGES[error.kind]
      : AUTH_MESSAGES[error.kind]
    : null;
  const finished = error instanceof ApiError && error.kind === 'subscription_not_found';

  return (
    <div className="dialog-backdrop" role="presentation" onClick={() => !working && close()}>
      <div
        className="dialog card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        aria-describedby="cancel-desc"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === 'simulated' && (
          <p className="dialog-mode" role="note">
            MODO SIMULADO · nada será alterado no YouTube
          </p>
        )}
        <div className="dialog-channel">
          <Avatar name={channel.title} src={channel.avatarUrl} size={56} />
          <div>
            <h2 id="cancel-title" className="dialog-title">
              Cancelar subscrição no YouTube?
            </h2>
            <p className="dialog-name">{channel.title}</p>
          </div>
        </div>

        {message ? (
          <div className="dialog-error" role="alert">
            <p className="dialog-error-title">{message.title}</p>
            <p>{message.body}</p>
          </div>
        ) : (
          <p id="cancel-desc" className="dialog-text">
            {mode === 'real' ? (
              <>
                Vais deixar de estar subscrito em <strong>{channel.title}</strong> na tua conta do YouTube. Esta alteração é
                real. Se mudares de ideias, podes voltar a subscrever no YouTube.
              </>
            ) : (
              <>
                Simulação: o canal <strong>{channel.title}</strong> sai da lista da CutSub, mas continuas subscrito no
                YouTube.
              </>
            )}
          </p>
        )}

        <div className="dialog-actions">
          <button ref={keepRef} type="button" className="btn btn--ghost" onClick={close} disabled={working}>
            {finished ? 'Fechar' : error ? 'Fechar' : 'Não, manter subscrição'}
          </button>
          {!finished && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={confirm}
              disabled={working}
              aria-busy={working}
            >
              {working ? <span className="btn-spinner btn-spinner--light" aria-hidden="true" /> : <Icon name="trash" size={18} />}
              {working ? 'A cancelar…' : error ? 'Tentar outra vez' : 'Sim, cancelar subscrição'}
            </button>
          )}
        </div>
        {mode === 'real' && !error && (
          <p className="dialog-note">Um canal de cada vez · cada cancelamento gasta 50 unidades da quota diária da API.</p>
        )}
      </div>
    </div>
  );
}

/** Contador de cancelamentos confirmados nesta sessão + mensagem de sucesso. */
export function CancelCounter({ api }: { api: CancellationApi }) {
  return (
    <div className="cancel-counter" role="status" aria-live="polite">
      <span className="cancel-counter-num">{api.sessionCount}</span>
      <span>
        {api.sessionCount === 1 ? 'subscrição cancelada' : 'subscrições canceladas'} no YouTube nesta sessão
        {api.mode === 'simulated' && <span className="cancel-counter-sim"> (simulado)</span>}
      </span>
      {api.lastCancelled && (
        <span className="cancel-counter-last">
          <Icon name="check" size={14} /> {api.mode === 'simulated' ? 'Simulado' : 'Cancelado'}: {api.lastCancelled}
          <button type="button" className="cancel-counter-close" onClick={api.dismissSuccess} aria-label="Fechar mensagem">
            ×
          </button>
        </span>
      )}
    </div>
  );
}
