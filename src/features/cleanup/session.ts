/**
 * Lógica (pura) da Limpeza Guiada. Não faz pedidos nem altera o YouTube.
 */
import type { ReviewStatus } from '../../domain/review';

export interface CleanupSession {
  /** Canais desta sessão (subconjunto filtrado), pela ordem em que são mostrados. */
  ids: string[];
  /** Descrição do subconjunto, ex.: "Fotografia · Não analisados". */
  label: string;
  /** Posição do canal atual em `ids`. */
  index: number;
  /** Posições visitadas, para o botão "Anterior". */
  history: number[];
  /** Chegou ao fim da lista. */
  done: boolean;
}

/** Devolve o estado do canal, ou undefined se o canal já não estiver na lista carregada. */
export type StatusOf = (channelId: string) => ReviewStatus | undefined;

function nextUnreviewed(ids: string[], statusOf: StatusOf, from: number): number {
  for (let i = from; i < ids.length; i += 1) {
    if (statusOf(ids[i]) === 'unreviewed') return i;
  }
  return -1;
}

export function createSession(ids: string[], label: string, statusOf: StatusOf): CleanupSession {
  const first = nextUnreviewed(ids, statusOf, 0);
  // Se todos já estiverem analisados, começa no primeiro (para rever decisões).
  const index = first >= 0 ? first : ids.findIndex((id) => statusOf(id) !== undefined);
  return { ids, label, index: Math.max(index, 0), history: [], done: ids.length === 0 || index < 0 };
}

/**
 * Avança para o próximo canal NÃO ANALISADO depois do atual.
 * Usado depois de uma decisão e em "Saltar" (que não altera o estado do canal).
 */
export function advance(session: CleanupSession, statusOf: StatusOf): CleanupSession {
  const next = nextUnreviewed(session.ids, statusOf, session.index + 1);
  const history = [...session.history, session.index];
  if (next < 0) return { ...session, history, done: true };
  return { ...session, index: next, history };
}

/** Volta ao canal mostrado anteriormente. */
export function goBack(session: CleanupSession): CleanupSession {
  if (session.done) return { ...session, done: false };
  if (session.history.length === 0) return session;
  const history = session.history.slice(0, -1);
  return { ...session, index: session.history[session.history.length - 1], history, done: false };
}

/** Recomeça a mesma sessão a partir do primeiro canal que ficou por analisar (ex.: os saltados). */
export function restartUnreviewed(session: CleanupSession, statusOf: StatusOf): CleanupSession {
  return createSession(session.ids, session.label, statusOf);
}
