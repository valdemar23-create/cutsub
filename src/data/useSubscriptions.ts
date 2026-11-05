import { useCallback, useEffect, useRef, useState } from 'react';
import type { Channel } from '../domain/channel';
import { ApiError, toApiError } from '../domain/errors';
import type { SubscriptionSource } from './SubscriptionSource';

/** Estado de uma atualização manual ("Atualizar lista") com a lista já carregada. */
export type RefreshState =
  | { phase: 'idle' }
  | { phase: 'running'; loaded: number; pass: number }
  | { phase: 'done'; count: number; previousCount: number }
  | { phase: 'failed'; error: ApiError };

export type SubscriptionsState =
  | { status: 'loading'; loaded: number }
  | { status: 'ready'; channels: Channel[]; refresh: RefreshState }
  | { status: 'error'; error: ApiError };

interface Options {
  /** Chamado quando a API responde 401 (token inválido/expirado). */
  onUnauthorized?: () => void;
}

/**
 * Carrega as subscrições UMA vez por fonte (sem polling).
 *
 * D3.2.1:
 * - "Atualizar lista" mantém a lista atual visível e só a substitui quando a nova leitura
 *   estiver COMPLETA (a camada da API nunca devolve resultados parciais).
 * - Se a atualização falhar, a lista anterior fica e é mostrado o erro.
 * - Só existe um carregamento de cada vez: pedidos repetidos enquanto decorre são ignorados.
 * - Cada carregamento tem um número de geração; um resultado antigo nunca substitui um mais recente.
 * - Canais cancelados durante uma atualização não reaparecem quando ela termina.
 */
export function useSubscriptions(source: SubscriptionSource, { onUnauthorized }: Options = {}) {
  const [state, setState] = useState<SubscriptionsState>({ status: 'loading', loaded: 0 });
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const generation = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  /** Canais retirados (cancelados) durante o carregamento em curso. */
  const removedDuringRun = useRef(new Set<string>());

  const run = useCallback(
    (mode: 'initial' | 'refresh') => {
      if (runningRef.current) return; // já há um carregamento em curso
      runningRef.current = true;
      removedDuringRun.current = new Set();
      const myGen = ++generation.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      const current = () => myGen === generation.current && !controller.signal.aborted;

      if (mode === 'initial') {
        setState({ status: 'loading', loaded: 0 });
      } else {
        setState((s) => (s.status === 'ready' ? { ...s, refresh: { phase: 'running', loaded: 0, pass: 1 } } : s));
      }

      source
        .load({
          signal: controller.signal,
          onProgress: ({ loaded, pass }) => {
            if (!current()) return;
            if (mode === 'initial') setState({ status: 'loading', loaded });
            else
              setState((s) =>
                s.status === 'ready' ? { ...s, refresh: { phase: 'running', loaded, pass: pass ?? 1 } } : s,
              );
          },
        })
        .then((channels) => {
          if (!current()) return;
          const removed = removedDuringRun.current;
          const fresh = removed.size ? channels.filter((c) => !removed.has(c.id)) : channels;
          setState((s) => ({
            status: 'ready',
            channels: fresh,
            refresh:
              mode === 'refresh'
                ? { phase: 'done', count: fresh.length, previousCount: s.status === 'ready' ? s.channels.length : 0 }
                : { phase: 'idle' },
          }));
        })
        .catch((err: unknown) => {
          if (!current()) return;
          // Erros da API já foram registados (sem token) na camada da API.
          if (!(err instanceof ApiError)) console.error('[subscriptions]', err);
          const error = toApiError(err);
          if (error.kind === 'unauthorized') onUnauthorizedRef.current?.();
          setState((s) =>
            mode === 'refresh' && s.status === 'ready'
              ? { ...s, refresh: { phase: 'failed', error } } // a lista anterior fica
              : { status: 'error', error },
          );
        })
        .finally(() => {
          if (myGen === generation.current) {
            runningRef.current = false;
            controllerRef.current = null;
          }
        });
    },
    [source],
  );

  // Carregamento inicial (e sempre que a fonte muda, ex.: novo login).
  useEffect(() => {
    runningRef.current = false;
    run('initial');
    return () => {
      generation.current += 1; // invalida resultados do carregamento anterior
      controllerRef.current?.abort();
      controllerRef.current = null;
      runningRef.current = false;
    };
  }, [run]);

  const stateRef = useRef(state);
  stateRef.current = state;

  /** "Atualizar lista" / "Tentar novamente". Ignorado se já houver um carregamento em curso. */
  const reload = useCallback(() => {
    run(stateRef.current.status === 'ready' ? 'refresh' : 'initial');
  }, [run]);

  /** Retira um canal da lista carregada (só depois de o YouTube confirmar o cancelamento). */
  const removeChannel = useCallback((channelId: string) => {
    if (runningRef.current) removedDuringRun.current.add(channelId);
    setState((s) => (s.status === 'ready' ? { ...s, channels: s.channels.filter((c) => c.id !== channelId) } : s));
  }, []);

  /** Esconde a mensagem "Lista atualizada" / erro da atualização. */
  const dismissRefresh = useCallback(() => {
    setState((s) => (s.status === 'ready' && s.refresh.phase !== 'running' ? { ...s, refresh: { phase: 'idle' } } : s));
  }, []);

  const refreshing = state.status === 'loading' || (state.status === 'ready' && state.refresh.phase === 'running');

  return { state, reload, removeChannel, dismissRefresh, refreshing };
}
