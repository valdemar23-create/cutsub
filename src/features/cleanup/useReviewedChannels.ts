import { useMemo, useRef } from 'react';
import type { Channel } from '../../domain/channel';
import { countReviews, type CategoryId, type ReviewedChannel, type ReviewStatus } from '../../domain/review';
import { classifyChannel } from '../../services/categoryClassifier';
import type { ReviewMap } from '../../services/reviewStorage';

/**
 * Junta os canais carregados com as decisões e categorias guardadas.
 * - Categoria manual tem sempre prioridade; a automática só se aplica quando não há manual.
 * - Canais novos (sem entrada guardada) começam como "Não analisado".
 * - Itens que não mudaram mantêm a mesma referência, para a lista não ser redesenhada inteira.
 */
export function useReviewedChannels(channels: Channel[], reviews: ReviewMap) {
  const suggested = useMemo(
    () => new Map<string, CategoryId>(channels.map((c) => [c.id, classifyChannel(c.title, c.description)])),
    [channels],
  );

  const cache = useRef(new Map<string, ReviewedChannel>());

  const items = useMemo(() => {
    const next = new Map<string, ReviewedChannel>();
    const list = channels.map((channel): ReviewedChannel => {
      const entry = reviews[channel.id];
      const status: ReviewStatus = entry?.status ?? 'unreviewed';
      const categoryIsManual = Boolean(entry?.category);
      const category: CategoryId = entry?.category ?? suggested.get(channel.id) ?? 'unclassified';
      const prev = cache.current.get(channel.id);
      const item: ReviewedChannel =
        prev &&
        prev.channel === channel &&
        prev.status === status &&
        prev.category === category &&
        prev.categoryIsManual === categoryIsManual
          ? prev
          : { channel, status, category, categoryIsManual };
      next.set(channel.id, item);
      return item;
    });
    cache.current = next;
    return list;
  }, [channels, reviews, suggested]);

  const counts = useMemo(() => countReviews(items), [items]);

  return { items, suggested, counts };
}
