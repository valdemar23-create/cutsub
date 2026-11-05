/**
 * Modelo normalizado de um canal subscrito.
 *
 * A UI trabalha sempre com este formato, nunca com a resposta crua da API.
 * Campos opcionais = dados que podem não existir; nesse caso a UI omite-os
 * em vez de inventar valores.
 *
 * Fases futuras (decisões Manter/Talvez/Remover, atividade, etc.) ficam em
 * estruturas separadas indexadas por `id`, sem alterar este modelo.
 */
export interface Channel {
  /** ID do canal no YouTube (snippet.resourceId.channelId). */
  id: string;
  /** ID da subscrição (item.id). Necessário na Fase 3 para cancelar; aqui só é lido. */
  subscriptionId?: string;
  /** Nome do canal (snippet.title). */
  title: string;
  /** Descrição (snippet.description). Pode vir vazia. */
  description?: string;
  /** URL do avatar (snippet.thumbnails). */
  avatarUrl?: string;
  /** Data em que o utilizador subscreveu (snippet.publishedAt), ISO 8601. */
  subscribedAt?: string;
  /** Link para abrir o canal no YouTube. */
  url?: string;
}

/** Link público de um canal a partir do seu ID. */
export function channelUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`;
}
