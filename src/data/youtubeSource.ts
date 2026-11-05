import { fetchAllSubscriptions } from '../api/subscriptions';
import { ApiError } from '../domain/errors';
import type { LoadOptions, SubscriptionSource } from './SubscriptionSource';

/**
 * Fonte de dados REAIS: subscrições da conta autenticada.
 * Recebe uma função que devolve o token atual (que vive só em memória, no AuthContext).
 */
export function createYoutubeSource(getAccessToken: () => string | null): SubscriptionSource {
  return {
    kind: 'youtube',
    async load({ signal, onProgress }: LoadOptions = {}) {
      const token = getAccessToken();
      if (!token) throw new ApiError('unauthorized', 401);
      const report = await fetchAllSubscriptions(token, {
        signal,
        onProgress: ({ loaded, pass }) => onProgress?.({ loaded, pass }),
      });
      return report.channels;
    },
  };
}
