import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DemoBanner } from '../../components/DemoBadge';
import { Icon } from '../../components/Icon';
import { LiveBanner } from '../../components/LiveBanner';
import { Loader } from '../../components/Loader';
import { LogoMark, Wordmark } from '../../components/Logo';
import { BottomNav, Sidebar, type Tab } from '../../components/Nav';
import { Notice } from '../../components/Notice';
import type { SubscriptionSource } from '../../data/SubscriptionSource';
import { useSubscriptions, type RefreshState } from '../../data/useSubscriptions';
import type { Channel } from '../../domain/channel';
import { DEFAULT_FILTERS, type ChannelFilters, type ReviewStatus } from '../../domain/review';
import { DEMO_REVIEW_STORAGE_KEY, REVIEW_STORAGE_KEY } from '../../services/reviewStorage';
import { formatNumber } from '../../utils/format';
import { ChannelList } from '../channels/ChannelList';
import { ChannelsScreen } from '../channels/ChannelsScreen';
import { SubscriptionsEmpty, SubscriptionsError } from '../channels/ChannelStates';
import { CleanupScreen, DEFAULT_CLEANUP_FILTERS } from '../cleanup/CleanupScreen';
import { CancelCounter, CancelDialog } from '../cancel/CancelDialog';
import { useCancellation, type CancellationApi } from '../cancel/useCancellation';
import { BackupPanel } from '../backup/BackupPanel';
import { InstallPrompt, OfflineBanner, UpdateBanner } from '../../pwa/PwaUi';
import { createSession, type CleanupSession } from '../cleanup/session';
import { useReviewedChannels } from '../cleanup/useReviewedChannels';
import { useReviewStore, type ReviewStore } from '../cleanup/useReviewStore';
import { ReviewProgressCard } from '../dashboard/ReviewProgressCard';
import { SummaryCard } from '../dashboard/SummaryCard';
import './shell.css';

const HOME_PREVIEW_COUNT = 6;

const TAB_TITLES: Record<Tab, string> = {
  home: 'Início',
  cleanup: 'Limpeza',
  channels: 'Os meus canais',
};

interface AppShellProps {
  source: SubscriptionSource;
  /** Nome do utilizador (ainda não usado). */
  userName?: string;
  /** Presente quando há sessão Google ativa. */
  sessionExpiresAt?: number;
  onLogout: () => void;
  /** A API respondeu 401: a sessão deixou de ser válida. */
  onUnauthorized?: () => void;
  /** Ferramenta de teste (só em desenvolvimento): simula a expiração da sessão. */
  onSimulateExpiry?: () => void;
}

export function AppShell({
  source,
  userName,
  sessionExpiresAt,
  onLogout,
  onUnauthorized,
  onSimulateExpiry,
}: AppShellProps) {
  const [tab, setTab] = useState<Tab>('home');
  const { state: subs, reload, removeChannel, dismissRefresh } = useSubscriptions(source, { onUnauthorized });
  const isDemo = source.kind === 'demo';
  const isEmpty = subs.status === 'ready' && subs.channels.length === 0;
  const mainRef = useRef<HTMLElement>(null);

  // Decisões locais (o modo DEMO usa uma chave separada, para nunca misturar com dados reais).
  const store = useReviewStore(isDemo ? DEMO_REVIEW_STORAGE_KEY : REVIEW_STORAGE_KEY);
  // Estado da organização: sobrevive à troca de separador e a "Atualizar lista".
  const [filters, setFilters] = useState<ChannelFilters>(DEFAULT_FILTERS);
  const [setupFilters, setSetupFilters] = useState<ChannelFilters>(DEFAULT_CLEANUP_FILTERS);
  const [session, setSession] = useState<CleanupSession | null>(null);
  // D3.2: cancelamento real (ou simulado) de UMA subscrição de cada vez.
  const cancellation = useCancellation(removeChannel);

  // Ao mudar de separador, volta ao topo.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [tab]);

  return (
    <div className="shell">
      <Sidebar active={tab} onChange={setTab} onLogout={onLogout} />

      <div className="shell-column">
        <header className="topbar">
          <div className="topbar-brand">
            <LogoMark size={30} />
            <Wordmark />
          </div>
          <h1 className="topbar-title">{TAB_TITLES[tab]}</h1>
          <button type="button" className="icon-btn" onClick={onLogout} aria-label="Terminar sessão" title="Terminar sessão">
            <Icon name="logout" />
          </button>
        </header>

        <main className="shell-main" ref={mainRef} tabIndex={-1}>
          <OfflineBanner />
          {isDemo ? <DemoBanner /> : <LiveBanner sessionExpiresAt={sessionExpiresAt} />}

          {subs.status === 'loading' && (
            <Loader
              label={isDemo ? 'A carregar as tuas subscrições…' : 'A carregar as tuas subscrições do YouTube…'}
              detail={subs.loaded > 0 ? `${formatNumber(subs.loaded)} canais` : undefined}
            />
          )}

          {subs.status === 'error' && subs.error.kind !== 'unauthorized' && (
            <SubscriptionsError error={subs.error} onRetry={reload} />
          )}

          {isEmpty && <SubscriptionsEmpty onRetry={isDemo ? undefined : reload} />}

          {subs.status === 'ready' && !isEmpty && (
            <Workspace
              tab={tab}
              onTab={setTab}
              channels={subs.channels}
              isDemo={isDemo}
              userName={userName}
              store={store}
              filters={filters}
              onFiltersChange={setFilters}
              setupFilters={setupFilters}
              onSetupFiltersChange={setSetupFilters}
              session={session}
              onSessionChange={setSession}
              onReload={isDemo ? undefined : reload}
              refresh={subs.refresh}
              onDismissRefresh={dismissRefresh}
              refreshBlocked={cancellation.state.phase === 'working'}
              onSimulateExpiry={onSimulateExpiry}
              cancellation={isDemo ? undefined : cancellation}
              storageMode={isDemo ? 'demo' : 'real'}
            />
          )}
        </main>
      </div>

      <BottomNav active={tab} onChange={setTab} />
      {!isDemo && <CancelDialog api={cancellation} />}
      {/* Atualizar a app espera que termine um cancelamento ou uma atualização da lista. */}
      <UpdateBanner
        busy={cancellation.state.phase === 'working' || (subs.status === 'ready' && subs.refresh.phase === 'running')}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface WorkspaceProps {
  tab: Tab;
  onTab: (tab: Tab) => void;
  channels: Channel[];
  isDemo: boolean;
  userName?: string;
  store: ReviewStore;
  filters: ChannelFilters;
  onFiltersChange: (f: ChannelFilters) => void;
  setupFilters: ChannelFilters;
  onSetupFiltersChange: (f: ChannelFilters) => void;
  session: CleanupSession | null;
  onSessionChange: (s: CleanupSession | null) => void;
  onReload?: () => void;
  /** D3.2.1: estado da atualização manual da lista. */
  refresh: RefreshState;
  onDismissRefresh: () => void;
  /** Um cancelamento está em curso: "Atualizar lista" espera que termine. */
  refreshBlocked: boolean;
  onSimulateExpiry?: () => void;
  /** Ausente no modo DEMO (canais fictícios não podem ser cancelados). */
  cancellation?: CancellationApi;
  storageMode: 'real' | 'demo';
}

/** Conteúdo dos separadores, quando as subscrições já estão carregadas. */
function Workspace({
  tab,
  onTab,
  channels,
  isDemo,
  userName,
  store,
  filters,
  onFiltersChange,
  setupFilters,
  onSetupFiltersChange,
  session,
  onSessionChange,
  onReload,
  refresh,
  onDismissRefresh,
  refreshBlocked,
  onSimulateExpiry,
  cancellation,
  storageMode,
}: WorkspaceProps) {
  const { items, suggested, counts } = useReviewedChannels(channels, store.reviews);
  const { setStatus, setCategory } = store;

  const statusById = useMemo(() => new Map<string, ReviewStatus>(items.map((it) => [it.channel.id, it.status])), [items]);

  const startCleanup = useCallback(
    (ids: string[], label: string) => {
      onSessionChange(createSession(ids, label, (id) => statusById.get(id)));
      onTab('cleanup');
    },
    [onSessionChange, onTab, statusById],
  );

  const showStatus = useCallback(
    (status: ReviewStatus) => {
      onFiltersChange({ ...DEFAULT_FILTERS, status });
      onTab('channels');
    },
    [onFiltersChange, onTab],
  );

  const showInChannels = useCallback(
    (f: ChannelFilters) => {
      onFiltersChange(f);
      onTab('channels');
    },
    [onFiltersChange, onTab],
  );

  return (
    <>
      {!store.persisted && (
        <div className="workspace-notice">
          <Notice tone="error" title="As decisões não estão a ser guardadas neste browser">
            O armazenamento local está bloqueado (por exemplo, numa janela privada). As decisões perdem-se ao fechar a página.
          </Notice>
        </div>
      )}

      {tab === 'home' && (
        <>
          <div className="greeting">
            <h2 className="greeting-title">{userName ? `Olá, ${userName}!` : 'Olá!'}</h2>
            <p className="greeting-sub">Aqui está um resumo das tuas subscrições.</p>
          </div>

          <div className="home-top">
            <SummaryCard
              total={counts.total}
              unreviewed={counts.unreviewed}
              isDemo={isDemo}
              sessionActive={session !== null && !session.done}
              onStartCleanup={() => onTab('cleanup')}
            />
            <ReviewProgressCard counts={counts} onShowStatus={showStatus} />
          </div>

          {cancellation && cancellation.sessionCount > 0 && <CancelCounter api={cancellation} />}

          <section className="section" aria-labelledby="my-channels">
            <div className="section-head">
              <h2 id="my-channels" className="section-title">
                Os meus canais
              </h2>
              {items.length > HOME_PREVIEW_COUNT && (
                <button type="button" className="link-btn" onClick={() => onTab('channels')}>
                  Ver todos ({formatNumber(items.length)})
                  <Icon name="chevronRight" size={16} />
                </button>
              )}
            </div>
            <ChannelList
              items={items.slice(0, HOME_PREVIEW_COUNT)}
              suggested={suggested}
              onStatus={setStatus}
              onCategory={setCategory}
              onCancelReal={cancellation?.ask}
            />
          </section>

          {onSimulateExpiry && (
            <section className="dev-tools" aria-label="Ferramentas de teste">
              <p className="dev-tools-title">Ferramentas de teste · só visível em desenvolvimento</p>
              <button type="button" className="btn btn--ghost" onClick={onSimulateExpiry}>
                Simular sessão expirada
              </button>
            </section>
          )}

          <InstallPrompt />
          <BackupPanel store={store} storageMode={storageMode} />
        </>
      )}

      {tab === 'cleanup' && (
        <CleanupScreen
          items={items}
          counts={counts}
          suggested={suggested}
          session={session}
          onSessionChange={onSessionChange}
          setupFilters={setupFilters}
          onSetupFiltersChange={onSetupFiltersChange}
          onStatus={setStatus}
          onCategory={setCategory}
          onShowInChannels={showInChannels}
        />
      )}

      {tab === 'channels' && (
        <ChannelsScreen
          items={items}
          counts={counts}
          suggested={suggested}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onStartCleanup={startCleanup}
          onReload={onReload}
          refresh={refresh}
          onDismissRefresh={onDismissRefresh}
          refreshBlocked={refreshBlocked}
          onStatus={setStatus}
          onCategory={setCategory}
          onCancelReal={cancellation?.ask}
          cancelCounter={cancellation ? <CancelCounter api={cancellation} /> : undefined}
        />
      )}
    </>
  );
}
