import { useCallback, useEffect, useRef, useState } from 'react';
import type { CategoryId, ReviewStatus } from '../../domain/review';
import { loadReviews, saveReviews, type ReviewMap } from '../../services/reviewStorage';

export interface ReviewStore {
  reviews: ReviewMap;
  /** false se o browser não deixou guardar (ex.: modo privado com armazenamento bloqueado). */
  persisted: boolean;
  setStatus: (channelId: string, status: ReviewStatus) => void;
  /** `null` volta à categoria automática. */
  setCategory: (channelId: string, category: CategoryId | null) => void;
  /** Substitui todas as decisões (importação de backup, após confirmação). */
  replaceAll: (reviews: ReviewMap) => void;
}

/**
 * Decisões e categorias manuais, guardadas localmente e associadas ao channelId.
 * Decisões de canais que já não aparecem na lista ficam guardadas sem causar erros
 * (voltam a ser usadas se o canal reaparecer).
 */
export function useReviewStore(storageKey: string): ReviewStore {
  const [reviews, setReviews] = useState<ReviewMap>(() => loadReviews(storageKey));
  const [persisted, setPersisted] = useState(true);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPersisted(saveReviews(storageKey, reviews));
  }, [storageKey, reviews]);

  const update = useCallback((channelId: string, patch: (e: ReviewMap[string]) => ReviewMap[string]) => {
    setReviews((prev) => {
      const next = { ...prev };
      const entry = patch({ ...prev[channelId] });
      if (entry.status || entry.category) next[channelId] = entry;
      else delete next[channelId];
      return next;
    });
  }, []);

  const setStatus = useCallback(
    (channelId: string, status: ReviewStatus) =>
      update(channelId, (e) => ({ ...e, status: status === 'unreviewed' ? undefined : status })),
    [update],
  );

  const setCategory = useCallback(
    (channelId: string, category: CategoryId | null) => update(channelId, (e) => ({ ...e, category: category ?? undefined })),
    [update],
  );

  const replaceAll = useCallback((next: ReviewMap) => setReviews({ ...next }), []);

  return { reviews, persisted, setStatus, setCategory, replaceAll };
}
