/**
 * Cancelamento de UMA subscrição no YouTube (D3.2).
 *
 * - Usa subscriptions.delete com o ID da SUBSCRIÇÃO (item.id), não o ID do canal.
 * - Custo: 50 unidades de quota por pedido.
 * - Nunca é chamado em lote nem automaticamente: só depois de o utilizador confirmar.
 */
import { ApiError } from '../domain/errors';
import { youtubeDelete } from './youtubeClient';

export async function cancelSubscriptionOnYouTube(subscriptionId: string, token: string): Promise<void> {
  if (!subscriptionId) throw new ApiError('unknown', 0, ['missingSubscriptionId']);
  await youtubeDelete('subscriptions', { id: subscriptionId }, token);
}

/** Modo simulado: não contacta o YouTube. */
export function simulateCancelSubscription(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 700));
}
