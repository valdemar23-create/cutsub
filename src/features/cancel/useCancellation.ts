import { useCallback, useRef, useState } from 'react';
import { cancelSubscriptionOnYouTube, simulateCancelSubscription } from '../../api/cancelSubscription';
import { useAuth } from '../../auth/AuthContext';
import { CANCEL_MODE } from '../../config/env';
import type { Channel } from '../../domain/channel';
import { ApiError, AuthError } from '../../domain/errors';

export type CancelPhase =
  | { phase: 'idle' }
  | { phase: 'confirm'; channel: Channel }
  | { phase: 'working'; channel: Channel }
  | { phase: 'error'; channel: Channel; error: ApiError | AuthError };

export interface CancellationApi {
  mode: 'simulated' | 'real';
  state: CancelPhase;
  /** Cancelamentos confirmados nesta sessão (não é guardado). */
  sessionCount: number;
  /** Último canal cancelado (para a mensagem de sucesso). */
  lastCancelled: string | null;
  ask: (channel: Channel) => void;
  close: () => void;
  /** Tem de ser chamado diretamente no clique "Sim, cancelar" (pode abrir a janela da Google). */
  confirm: () => void;
  dismissSuccess: () => void;
}

/**
 * Cancelamento de subscrições, UM canal de cada vez.
 * - Abre sempre uma confirmação com o nome do canal.
 * - Só retira o canal da lista depois de o YouTube responder com sucesso (204).
 * - Um único pedido em curso: cliques repetidos são ignorados.
 */
export function useCancellation(onCancelled: (channelId: string) => void): CancellationApi {
  const { ensureWriteAccess, dropWriteAccess } = useAuth();
  const [state, setState] = useState<CancelPhase>({ phase: 'idle' });
  const [sessionCount, setSessionCount] = useState(0);
  const [lastCancelled, setLastCancelled] = useState<string | null>(null);
  // Trava síncrona: impede dois pedidos mesmo com cliques muito rápidos.
  const inFlight = useRef(false);

  const ask = useCallback((channel: Channel) => {
    if (inFlight.current) return;
    setLastCancelled(null);
    setState({ phase: 'confirm', channel });
  }, []);

  const close = useCallback(() => {
    if (inFlight.current) return; // não fechar a meio do pedido
    setState({ phase: 'idle' });
  }, []);

  const confirm = useCallback(() => {
    if (inFlight.current) return;
    const current = state;
    if (current.phase !== 'confirm' && current.phase !== 'error') return;
    const channel = current.channel;
    if (!channel.subscriptionId) {
      setState({ phase: 'error', channel, error: new ApiError('unknown', 0, ['missingSubscriptionId']) });
      return;
    }
    inFlight.current = true;
    setState({ phase: 'working', channel });

    const run: Promise<void> =
      CANCEL_MODE === 'real'
        ? // ensureWriteAccess é chamado já, dentro do clique (a janela da Google não é bloqueada).
          ensureWriteAccess(channel.id).then((token) => cancelSubscriptionOnYouTube(channel.subscriptionId!, token))
        : simulateCancelSubscription();

    run
      .then(() => {
        onCancelled(channel.id);
        setSessionCount((n) => n + 1);
        setLastCancelled(channel.title);
        setState({ phase: 'idle' });
      })
      .catch((err: unknown) => {
        const error = err instanceof ApiError || err instanceof AuthError ? err : new ApiError('unknown');
        if (error instanceof ApiError && error.kind === 'unauthorized') dropWriteAccess();
        if (error instanceof ApiError && error.kind === 'subscription_not_found') {
          // Já não existia no YouTube: retira da lista, mas não conta como cancelamento desta sessão.
          onCancelled(channel.id);
        }
        setState({ phase: 'error', channel, error });
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [state, ensureWriteAccess, dropWriteAccess, onCancelled]);

  const dismissSuccess = useCallback(() => setLastCancelled(null), []);

  return { mode: CANCEL_MODE, state, sessionCount, lastCancelled, ask, close, confirm, dismissSuccess };
}
