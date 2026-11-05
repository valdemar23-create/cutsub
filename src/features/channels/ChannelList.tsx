import { useEffect, useRef, useState } from 'react';
import type { CategoryId, ReviewedChannel } from '../../domain/review';
import { formatNumber } from '../../utils/format';
import { ChannelCard, type ChannelCardActions } from './ChannelCard';
import './channels.css';

/** Cartões desenhados de cada vez; os seguintes aparecem ao fazer scroll. */
const PAGE_SIZE = 48;

interface ChannelListProps extends ChannelCardActions {
  items: ReviewedChannel[];
  suggested: Map<string, CategoryId>;
  /** Quando muda (ex.: novos filtros), a lista volta a mostrar só a primeira parte. */
  resetKey?: string;
}

export function ChannelList({ items, suggested, onStatus, onCategory, onCancelReal, resetKey }: ChannelListProps) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = items.length > limit;

  useEffect(() => setLimit(PAGE_SIZE), [resetKey]);

  // Carregamento progressivo: com centenas de canais, desenhar tudo de uma vez torna a pesquisa lenta.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setLimit((n) => n + PAGE_SIZE),
      { rootMargin: '1200px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, limit]);

  return (
    <>
      <ul className="channel-grid">
        {items.slice(0, limit).map((it) => (
          <li key={it.channel.id}>
            <ChannelCard
              item={it}
              suggested={suggested.get(it.channel.id) ?? 'unclassified'}
              onStatus={onStatus}
              onCategory={onCategory}
              onCancelReal={onCancelReal}
            />
          </li>
        ))}
      </ul>
      {hasMore && (
        <div ref={sentinel} className="list-more">
          <button type="button" className="btn btn--ghost" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
            Mostrar mais ({formatNumber(items.length - limit)} restantes)
          </button>
        </div>
      )}
    </>
  );
}
