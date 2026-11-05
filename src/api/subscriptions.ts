/**
 * Leitura de TODAS as subscrições do utilizador autenticado (subscriptions.list).
 *
 * Paginação: pede páginas de 50 e segue nextPageToken até não haver mais.
 * Custo de quota: 1 unidade por página (ex.: 600 canais = 12 unidades).
 */
import { channelUrl, type Channel } from '../domain/channel';
import { ApiError } from '../domain/errors';
import { youtubeGet } from './youtubeClient';

/** Formato (parcial) da resposta da API. */
interface SubscriptionListResponse {
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
  items?: SubscriptionItem[];
}

interface Thumbnail {
  url?: string;
}

interface SubscriptionItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    resourceId?: { channelId?: string };
    thumbnails?: { default?: Thumbnail; medium?: Thumbnail };
  };
}

/** Pedimos só os campos que usamos (resposta mais leve; não altera a quota). */
const FIELDS =
  'nextPageToken,pageInfo/totalResults,' +
  'items(id,snippet(title,description,publishedAt,resourceId/channelId,thumbnails/default/url,thumbnails/medium/url))';

/** Proteção contra ciclos infinitos (equivale a 20 000 subscrições). */
const MAX_PAGES = 400;


/** Converte um item da API no nosso modelo. Devolve null se faltar o channelId. */
export function normalizeSubscription(item: SubscriptionItem): Channel | null {
  const s = item.snippet;
  const channelId = s?.resourceId?.channelId;
  if (!channelId) return null;

  const description = s?.description?.trim();
  return {
    id: channelId,
    subscriptionId: item.id,
    title: s?.title?.trim() || 'Canal sem nome',
    description: description || undefined,
    avatarUrl: s?.thumbnails?.medium?.url || s?.thumbnails?.default?.url || undefined,
    subscribedAt: s?.publishedAt,
    url: channelUrl(channelId),
  };
}

/* ------------------------------------------------------------------ */
/* D3.2.1 — Leitura completa e consistente                             */
/* ------------------------------------------------------------------ */

/** Tentativas por página para erros transitórios (rede, 5xx, limite de pedidos). */
const MAX_RETRIES = 3;
/** Espera progressiva entre tentativas: 0,6 s → 1,2 s → 2,4 s (+ variação aleatória). */
const BACKOFF_BASE_MS = 600;
/** Leituras completas no máximo, quando é preciso confirmar a consistência. */
const MAX_PASSES = 3;
const CHANNEL_ID_RE = /^UC[\w-]{22}$/;

/** Motivos de 403/429 que são temporários (não são a quota diária). */
const TRANSIENT_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded', 'backendError', 'internalError']);

export interface FetchProgress {
  loaded: number;
  page: number;
  /** 1.ª, 2.ª… leitura completa (só há mais do que uma se for preciso confirmar). */
  pass: number;
}

export interface FetchReport {
  channels: Channel[];
  pages: number;
  passes: number;
  retries: number;
  reportedTotal?: number;
}

interface PassResult {
  byChannel: Map<string, Channel>;
  pages: number;
  duplicates: number;
  conflicts: number;
  invalid: number;
  reportedTotal?: number;
}

function isTransient(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.kind === 'network' || err.kind === 'server') return true;
  if (err.status === 429) return true;
  return err.reasons.some((r) => TRANSIENT_REASONS.has(r));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Cancelado', 'AbortError'));
    }, { once: true });
  });
}

/** Uma página, com tentativas automáticas limitadas para erros transitórios. */
async function fetchPage(
  token: string,
  pageToken: string | undefined,
  signal: AbortSignal | undefined,
  onRetry: () => void,
): Promise<SubscriptionListResponse> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const data = await youtubeGet<SubscriptionListResponse>(
        'subscriptions',
        // order=alphabetical: ordem estável entre páginas (a ordem por defeito, "relevance",
        // pode mudar entre pedidos e fazer canais saltarem de página → duplicados e canais em falta).
        { part: 'snippet', mine: 'true', maxResults: '50', order: 'alphabetical', pageToken, fields: FIELDS },
        token,
        signal,
      );
      // Resposta incompleta: sem lista de itens não sabemos o que falta.
      if (!data || !Array.isArray(data.items)) throw new ApiError('server', 200, ['incompleteResponse']);
      return data;
    } catch (err) {
      if (signal?.aborted) throw err;
      if (!isTransient(err) || attempt >= MAX_RETRIES) throw err;
      onRetry();
      const wait = BACKOFF_BASE_MS * 2 ** attempt + Math.round(Math.random() * 250);
      console.warn(`[youtube] Erro temporário na página; nova tentativa ${attempt + 1}/${MAX_RETRIES} dentro de ${wait} ms.`);
      await sleep(wait, signal);
    }
  }
}

/** Uma leitura completa, página a página, até deixar de existir nextPageToken. */
async function fetchPass(
  token: string,
  pass: number,
  signal: AbortSignal | undefined,
  onProgress: ((p: FetchProgress) => void) | undefined,
  onRetry: () => void,
): Promise<PassResult> {
  const byChannel = new Map<string, Channel>();
  const seenTokens = new Set<string>();
  let pageToken: string | undefined;
  let pages = 0;
  let duplicates = 0;
  let conflicts = 0;
  let invalid = 0;
  let unusualIds = 0;
  let reportedTotal: number | undefined;

  do {
    pages += 1;
    const data = await fetchPage(token, pageToken, signal, onRetry);
    reportedTotal ??= data.pageInfo?.totalResults;

    for (const item of data.items ?? []) {
      const channel = normalizeSubscription(item);
      // Sem channelId ou sem ID de subscrição não é possível mostrar nem cancelar o canal.
      if (!channel || !channel.subscriptionId) {
        invalid += 1;
        continue;
      }
      // Formato inesperado do ID: regista, mas NÃO descarta (descartar seria perder canais).
      if (!CHANNEL_ID_RE.test(channel.id)) unusualIds += 1;
      const existing = byChannel.get(channel.id);
      if (!existing) byChannel.set(channel.id, channel);
      else if (existing.subscriptionId === channel.subscriptionId) duplicates += 1;
      else conflicts += 1; // mesmo canal com duas subscrições diferentes: dados inconsistentes
    }
    onProgress?.({ loaded: byChannel.size, page: pages, pass });

    pageToken = data.nextPageToken || undefined;
    if (pageToken) {
      // Antes: interrompia em silêncio e devolvia uma lista parcial. Agora é um erro.
      if (seenTokens.has(pageToken)) throw new ApiError('server', 200, ['repeatedPageToken']);
      seenTokens.add(pageToken);
    }
    if (pages >= MAX_PAGES && pageToken) throw new ApiError('unknown', 200, ['tooManyPages']);
  } while (pageToken);

  if (unusualIds) console.warn(`[youtube] ${unusualIds} ID(s) de canal com formato inesperado (mantidos).`);
  return { byChannel, pages, duplicates, conflicts, invalid, reportedTotal };
}

function sameIds(a: Map<string, Channel>, b: Map<string, Channel>): boolean {
  if (a.size !== b.size) return false;
  for (const [id, ch] of a) if (b.get(id)?.subscriptionId !== ch.subscriptionId) return false;
  return true;
}

/**
 * Lê TODAS as subscrições e só devolve uma lista completa e consistente.
 * - Cada página tem até 3 novas tentativas para erros transitórios.
 * - Uma leitura sem sinais de instabilidade é aceite logo.
 * - Com duplicados ou conflitos: nova leitura completa (até 3); só é aceite uma leitura limpa.
 * - Com menos canais do que pageInfo.totalResults (pode ser permanente: canais ocultos/encerrados):
 *   é aceite quando duas leituras seguidas, sem duplicados, coincidem.
 * - Caso contrário lança ApiError('inconsistent'): quem chama mantém a lista anterior.
 * - Nunca devolve resultados parciais.
 */
export async function fetchAllSubscriptions(
  token: string,
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (p: FetchProgress) => void } = {},
): Promise<FetchReport> {
  let retries = 0;
  const onRetry = () => {
    retries += 1;
  };

  let previous: PassResult | null = null;
  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    const result = await fetchPass(token, pass, signal, onProgress, onRetry);
    const suspicious =
      result.duplicates > 0 ||
      result.conflicts > 0 ||
      (result.reportedTotal !== undefined && result.byChannel.size < result.reportedTotal);

    // Aceite se: a leitura não tem sinais de instabilidade, OU coincide com a leitura anterior.
    // Duplicados significam que algum canal "saltou" de página — e outro pode ter ficado de fora.
    // Por isso uma leitura com duplicados nunca é aceite, mesmo que se repita igual.
    const confirmed =
      previous !== null &&
      sameIds(previous.byChannel, result.byChannel) &&
      result.conflicts === 0 &&
      result.duplicates === 0;
    const accepted = confirmed || !suspicious;

    console.info(
      `[youtube] Leitura ${pass}: ${result.byChannel.size} subscrições em ${result.pages} página(s).` +
        (result.reportedTotal !== undefined ? ` pageInfo.totalResults=${result.reportedTotal}.` : '') +
        (result.duplicates ? ` ${result.duplicates} duplicado(s).` : '') +
        (result.conflicts ? ` ${result.conflicts} conflito(s).` : '') +
        (result.invalid ? ` ${result.invalid} item(ns) inválido(s) ignorado(s).` : '') +
        (accepted ? ' Aceite.' : ' A confirmar com nova leitura.'),
    );

    if (accepted) {
      const collator = new Intl.Collator('pt-PT', { sensitivity: 'base', numeric: true });
      const channels = [...result.byChannel.values()].sort((a, b) => collator.compare(a.title, b.title));
      return { channels, pages: result.pages, passes: pass, retries, reportedTotal: result.reportedTotal };
    }
    previous = result;
  }
  throw new ApiError('inconsistent', 200, ['passesDisagree']);
}
