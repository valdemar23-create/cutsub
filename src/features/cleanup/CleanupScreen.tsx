import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import {
  applyFilters,
  DECISIONS,
  DEFAULT_FILTERS,
  percent,
  REVIEW_LABELS,
  type CategoryId,
  type ChannelFilters,
  type ReviewCounts,
  type ReviewedChannel,
  type ReviewStatus,
} from '../../domain/review';
import { formatDate, formatNumber, timeAgo } from '../../utils/format';
import { describeFilters } from '../channels/ChannelsScreen';
import { CategoryFilter, PeriodFilter, StatusFilter } from '../channels/ChannelFilters';
import { CategorySelect, DECISION_ICON, StatusBadge } from '../channels/ReviewControls';
import { ProgressBar } from '../dashboard/ReviewProgressCard';
import { advance, createSession, goBack, restartUnreviewed, type CleanupSession, type StatusOf } from './session';
import './cleanup.css';

/** Filtros por defeito ao preparar uma limpeza: só os que faltam analisar. */
export const DEFAULT_CLEANUP_FILTERS: ChannelFilters = { ...DEFAULT_FILTERS, status: 'unreviewed' };

const NO_CHANGES_NOTE = 'Não será feita nenhuma alteração no YouTube nesta fase.';

interface CleanupScreenProps {
  items: ReviewedChannel[];
  counts: ReviewCounts;
  suggested: Map<string, CategoryId>;
  session: CleanupSession | null;
  onSessionChange: (s: CleanupSession | null) => void;
  setupFilters: ChannelFilters;
  onSetupFiltersChange: (f: ChannelFilters) => void;
  onStatus: (channelId: string, status: ReviewStatus) => void;
  onCategory: (channelId: string, category: CategoryId | null) => void;
  onShowInChannels: (f: ChannelFilters) => void;
}

export function CleanupScreen(props: CleanupScreenProps) {
  const { items, session } = props;
  const byId = useMemo(() => new Map(items.map((it) => [it.channel.id, it])), [items]);
  const statusOf: StatusOf = useCallback((id) => byId.get(id)?.status, [byId]);

  if (!session) return <CleanupSetup {...props} statusOf={statusOf} />;
  if (session.done) return <CleanupDone {...props} session={session} byId={byId} statusOf={statusOf} />;
  return <CleanupReview {...props} session={session} byId={byId} statusOf={statusOf} />;
}

/* ------------------------------------------------------------------ */
/* Preparação: escolher o subconjunto                                  */
/* ------------------------------------------------------------------ */

function CleanupSetup({
  items,
  counts,
  setupFilters,
  onSetupFiltersChange,
  onSessionChange,
  statusOf,
}: CleanupScreenProps & { statusOf: StatusOf }) {
  const selected = useMemo(() => applyFilters(items, setupFilters), [items, setupFilters]);
  const set = (patch: Partial<ChannelFilters>) => onSetupFiltersChange({ ...setupFilters, ...patch });
  const pct = percent(counts.reviewed, counts.total);

  const start = () =>
    onSessionChange(createSession(selected.map((it) => it.channel.id), describeFilters(setupFilters), statusOf));

  return (
    <div className="cleanup">
      <header className="cleanup-intro">
        <h2 className="greeting-title">Limpeza guiada</h2>
        <p className="greeting-sub">Vê um canal de cada vez e decide: Manter, Talvez ou Remover.</p>
      </header>

      <section className="card cleanup-progress-card" aria-label="Progresso total">
        <div className="progress-head">
          <span className="progress-title">
            {formatNumber(counts.reviewed)} de {formatNumber(counts.total)} analisados
          </span>
          <span className="progress-pct">{pct}%</span>
        </div>
        <ProgressBar value={pct} label="Canais analisados no total" />
      </section>

      <section className="card cleanup-setup" aria-labelledby="setup-title">
        <h3 id="setup-title" className="cleanup-setup-title">
          O que queres analisar?
        </h3>
        <div className="cleanup-fields">
          <CategoryFilter id="setup-category" value={setupFilters.category} counts={counts} onChange={(category) => set({ category })} />
          <StatusFilter id="setup-status" value={setupFilters.status} counts={counts} onChange={(status) => set({ status })} />
          <PeriodFilter id="setup-period" value={setupFilters.period} onChange={(period) => set({ period })} />
        </div>

        <p className="cleanup-selected" aria-live="polite">
          <strong>{formatNumber(selected.length)}</strong> {selected.length === 1 ? 'canal' : 'canais'} para analisar
        </p>

        <button type="button" className="btn btn--accent btn--lg btn--block" onClick={start} disabled={selected.length === 0}>
          <Icon name="broom" size={22} />
          Começar
        </button>
        <p className="cleanup-note">{NO_CHANGES_NOTE}</p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Análise canal a canal                                               */
/* ------------------------------------------------------------------ */

function CleanupReview({
  session,
  byId,
  statusOf,
  suggested,
  onSessionChange,
  onStatus,
  onCategory,
}: CleanupScreenProps & { session: CleanupSession; byId: Map<string, ReviewedChannel>; statusOf: StatusOf }) {
  const currentId = session.ids[session.index];
  const item = byId.get(currentId);
  const [expanded, setExpanded] = useState(false);

  const sessionReviewed = session.ids.filter((id) => {
    const s = statusOf(id);
    return s !== undefined && s !== 'unreviewed';
  }).length;
  const pct = percent(sessionReviewed, session.ids.length);

  const decide = useCallback(
    (status: Exclude<ReviewStatus, 'unreviewed'>) => {
      onStatus(currentId, status);
      // O canal atual já ficou decidido; procura o próximo NÃO ANALISADO.
      onSessionChange(advance(session, statusOf));
    },
    [currentId, onStatus, onSessionChange, session, statusOf],
  );
  const skip = useCallback(() => onSessionChange(advance(session, statusOf)), [onSessionChange, session, statusOf]);
  const back = useCallback(() => onSessionChange(goBack(session)), [onSessionChange, session]);

  // Ao mudar de canal: descrição recolhida e volta ao topo.
  useEffect(() => {
    setExpanded(false);
    window.scrollTo({ top: 0 });
  }, [currentId]);

  // Se o canal desapareceu (ex.: "Atualizar lista" depois de cancelares no YouTube), passa ao seguinte.
  useEffect(() => {
    if (!item) onSessionChange(advance(session, statusOf));
  }, [item, onSessionChange, session, statusOf]);

  // Atalhos de teclado (desktop): 1 Manter · 2 Talvez · 3 Remover · S/→ Saltar · ← Anterior
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest('input, select, textarea')) return;
      if (e.key === '1') decide('keep');
      else if (e.key === '2') decide('maybe');
      else if (e.key === '3') decide('remove');
      else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowRight') skip();
      else if (e.key === 'ArrowLeft') back();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, skip, back]);

  if (!item) return null;
  const { channel, status, category, categoryIsManual } = item;
  const since = formatDate(channel.subscribedAt);
  const ago = timeAgo(channel.subscribedAt);

  return (
    <div className="cleanup cleanup--review">
      <div className="review-top">
        <button type="button" className="review-exit" onClick={() => onSessionChange(null)} aria-label="Terminar esta limpeza">
          <Icon name="arrowLeft" size={20} />
          <span>Terminar</span>
        </button>
        <span className="review-position">
          Canal {formatNumber(session.index + 1)} de {formatNumber(session.ids.length)}
        </span>
      </div>

      <div className="review-progress">
        <div className="progress-head">
          <span className="review-progress-text">
            {formatNumber(sessionReviewed)} de {formatNumber(session.ids.length)} analisados
          </span>
          <span className="progress-pct">{pct}%</span>
        </div>
        <ProgressBar value={pct} label="Canais analisados nesta limpeza" />
        <p className="review-subset">{session.label}</p>
      </div>

      <article className="review-card card" data-status={status}>
        <div className="review-head">
          <Avatar name={channel.title} src={channel.avatarUrl} size={88} />
          <div className="review-head-text">
            <h2 className="review-title">{channel.title}</h2>
            <StatusBadge status={status} />
          </div>
        </div>

        <CategorySelect
          className="review-category"
          value={category}
          isManual={categoryIsManual}
          suggested={suggested.get(channel.id) ?? 'unclassified'}
          onChange={(c) => onCategory(channel.id, c)}
        />

        {channel.description ? (
          <div className="review-desc-wrap">
            <p className={`review-desc${expanded ? ' is-expanded' : ''}`}>{channel.description}</p>
            {channel.description.length > 220 && (
              <button type="button" className="link-btn" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </div>
        ) : (
          <p className="review-desc review-desc--empty">Sem descrição</p>
        )}

        <div className="review-facts">
          {since && (
            <div className="review-fact">
              <Icon name="calendar" size={20} />
              <div>
                <span className="review-fact-label">Subscrito desde</span>
                <span className="review-fact-value">
                  {since}
                  {ago && <span className="review-fact-sub"> ({ago})</span>}
                </span>
              </div>
            </div>
          )}
          {channel.url ? (
            <a className="review-fact review-open" href={channel.url} target="_blank" rel="noopener noreferrer">
              <Icon name="play" size={20} />
              <div>
                <span className="review-fact-label">Ver o canal</span>
                <span className="review-fact-value">
                  Abrir no YouTube <Icon name="external" size={14} />
                </span>
              </div>
            </a>
          ) : (
            <div className="review-fact review-fact--off">
              <Icon name="play" size={20} />
              <div>
                <span className="review-fact-label">Ver o canal</span>
                <span className="review-fact-value">Link indisponível</span>
              </div>
            </div>
          )}
        </div>
      </article>

      <div className="review-dock">
      <div className="review-actions" role="group" aria-label="Decisão para este canal">
        {DECISIONS.map((d, i) => (
          <button
            key={d}
            type="button"
            className={`review-action review-action--${d}${status === d ? ' is-active' : ''}`}
            aria-pressed={status === d}
            onClick={() => decide(d)}
            title={`${REVIEW_LABELS[d]} (tecla ${i + 1})`}
          >
            <span className="review-action-circle">
              <Icon name={DECISION_ICON[d]} size={30} fill={d === 'keep' ? 'currentColor' : 'none'} strokeWidth={2.2} />
            </span>
            <span className="review-action-label">{REVIEW_LABELS[d]}</span>
          </button>
        ))}
      </div>

      <div className="review-nav">
        <button type="button" className="btn btn--ghost" onClick={back} disabled={session.history.length === 0}>
          <Icon name="arrowLeft" size={18} />
          Anterior
        </button>
        <button type="button" className="btn btn--ghost review-skip" onClick={skip}>
          <Icon name="skip" size={18} />
          Saltar este canal
        </button>
      </div>
      </div>

      <p className="cleanup-note">{NO_CHANGES_NOTE}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fim da sessão                                                       */
/* ------------------------------------------------------------------ */

function CleanupDone({
  session,
  statusOf,
  onSessionChange,
  onShowInChannels,
}: CleanupScreenProps & { session: CleanupSession; byId: Map<string, ReviewedChannel>; statusOf: StatusOf }) {
  const tally = { unreviewed: 0, keep: 0, maybe: 0, remove: 0 };
  for (const id of session.ids) {
    const s = statusOf(id);
    if (s) tally[s] += 1;
  }

  return (
    <div className="cleanup">
      <section className="card cleanup-done">
        <span className="state-icon state-icon--done">
          <Icon name="check" size={28} />
        </span>
        <h2 className="state-title">{tally.unreviewed === 0 ? 'Limpeza concluída!' : 'Chegaste ao fim da lista'}</h2>
        <p className="state-text">{session.label}</p>

        <div className="done-tally">
          {DECISIONS.map((d) => (
            <div key={d} className={`done-tile done-tile--${d}`}>
              <span className="done-num">{formatNumber(tally[d])}</span>
              <span className="done-label">{REVIEW_LABELS[d]}</span>
            </div>
          ))}
        </div>

        {tally.unreviewed > 0 && (
          <>
            <p className="state-text">
              Ficaram {formatNumber(tally.unreviewed)} {tally.unreviewed === 1 ? 'canal saltado' : 'canais saltados'} por analisar.
            </p>
            <button
              type="button"
              className="btn btn--accent btn--block"
              onClick={() => onSessionChange(restartUnreviewed(session, statusOf))}
            >
              Analisar os que saltei
            </button>
          </>
        )}
        {tally.remove > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => onShowInChannels({ ...DEFAULT_FILTERS, status: 'remove' })}
          >
            <Icon name="trash" size={18} />
            Ver todos os marcados para remover
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--block" onClick={() => onSessionChange(null)}>
          Nova limpeza
        </button>
        <p className="cleanup-note">{NO_CHANGES_NOTE}</p>
      </section>
    </div>
  );
}
