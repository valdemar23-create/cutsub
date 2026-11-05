/**
 * Erros de autenticação, traduzidos para mensagens amigáveis.
 * Os detalhes técnicos ficam apenas na consola.
 */
export type AuthErrorKind =
  | 'config_missing' // falta o Client ID (.env.local)
  | 'gis_unavailable' // não foi possível carregar a biblioteca da Google
  | 'denied' // o utilizador recusou a autorização
  | 'scope_missing' // autorizou, mas desmarcou o acesso ao YouTube
  | 'popup_closed' // fechou a janela antes de terminar
  | 'popup_blocked' // o browser bloqueou a janela
  | 'write_scope_missing' // recusou a permissão de gestão (cancelar subscrições)
  | 'unknown';

export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(kind: AuthErrorKind) {
    super(kind);
    this.name = 'AuthError';
    this.kind = kind;
  }
}

export function toAuthError(err: unknown): AuthError {
  return err instanceof AuthError ? err : new AuthError('unknown');
}

export const AUTH_MESSAGES: Record<AuthErrorKind, { title: string; body: string }> = {
  config_missing: {
    title: 'A ligação à Google ainda não está configurada',
    body: 'Falta o Client ID no ficheiro .env.local. Segue o guia docs/GOOGLE_CLOUD_SETUP.md e reinicia o npm run dev.',
  },
  gis_unavailable: {
    title: 'Não foi possível contactar a Google',
    body: 'Verifica a tua ligação à internet. Se usas um bloqueador de anúncios ou de scripts, permite accounts.google.com e recarrega a página.',
  },
  denied: {
    title: 'Autorização recusada',
    body: 'Sem autorização não conseguimos ver as tuas subscrições. Podes tentar outra vez quando quiseres.',
  },
  scope_missing: {
    title: 'Falta a permissão do YouTube',
    body: 'Para veres os teus canais, deixa marcada a opção de ver a tua conta do YouTube no ecrã da Google.',
  },
  popup_closed: {
    title: 'A janela da Google foi fechada',
    body: 'A ligação não ficou concluída. Carrega novamente em "Ligar ao YouTube" para tentar outra vez.',
  },
  popup_blocked: {
    title: 'O browser bloqueou a janela da Google',
    body: 'Permite janelas pop-up para este site e tenta outra vez.',
  },
  write_scope_missing: {
    title: 'Falta a permissão para gerir o YouTube',
    body: 'Para cancelar subscrições, a Google tem de autorizar a gestão da tua conta do YouTube. Sem essa permissão, nada é alterado.',
  },
  unknown: {
    title: 'Algo correu mal na ligação à Google',
    body: 'Tenta outra vez dentro de momentos.',
  },
};

/* ---------- Erros da YouTube Data API ---------- */

export type ApiErrorKind =
  | 'unauthorized' // 401: token inválido ou expirado → voltar a ligar
  | 'quota' // 403/429: quota diária ou limite de pedidos
  | 'api_disabled' // 403: YouTube Data API não ativada no projeto
  | 'forbidden' // 403: outros motivos (permissões, conta)
  | 'no_channel' // 404: a conta Google não tem canal do YouTube
  | 'subscription_not_found' // 404 num cancelamento: a subscrição já não existe
  | 'network' // sem ligação / pedido não chegou ao servidor
  | 'server' // 5xx do YouTube (ou resposta incompleta)
  | 'inconsistent' // D3.2.1: leituras seguidas deram listas diferentes
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** Código HTTP (0 se o pedido nem chegou ao servidor). */
  readonly status: number;
  /** Motivos devolvidos pela API (ex.: "quotaExceeded"). Nunca contêm o token. */
  readonly reasons: string[];

  constructor(kind: ApiErrorKind, status = 0, reasons: string[] = []) {
    super(`${kind} (HTTP ${status}${reasons.length ? ` · ${reasons.join(', ')}` : ''})`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.reasons = reasons;
  }
}

export function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError('unknown');
}

/** Texto adicional por baixo de "Não foi possível carregar as tuas subscrições." */
export const API_ERROR_HINTS: Record<ApiErrorKind, string> = {
  unauthorized: 'A tua sessão já não é válida. Volta a ligar ao YouTube.',
  quota: 'O limite diário de pedidos à API do YouTube foi atingido. Tenta novamente mais tarde (o limite renova-se diariamente).',
  api_disabled: 'A YouTube Data API v3 não está ativada no projeto Google Cloud. Ativa-a e tenta novamente.',
  forbidden: 'O YouTube recusou o acesso às subscrições desta conta. Confirma que deste a permissão "Ver a tua conta do YouTube" e que escolheste o canal certo ao entrar.',
  subscription_not_found: 'A subscrição já não existe no YouTube.',
  no_channel: 'Esta conta Google não parece ter um canal do YouTube. Se tens vários canais, termina sessão e escolhe o canal certo ao entrar.',
  network: 'Parece haver um problema de ligação à internet. Verifica a ligação e tenta novamente.',
  server: 'O YouTube está com dificuldades temporárias. Tenta novamente dentro de momentos.',
  inconsistent: 'O YouTube devolveu listas diferentes em leituras seguidas. Tenta novamente dentro de momentos.',
  unknown: 'Ocorreu um erro inesperado. Tenta novamente.',
};

/** Mensagens específicas para cancelamentos (D3.2). */
export const CANCEL_ERROR_MESSAGES: Record<ApiErrorKind, { title: string; body: string }> = {
  unauthorized: {
    title: 'A autorização para cancelar já não é válida',
    body: 'Nada foi alterado. Tenta outra vez: a Google volta a pedir-te permissão.',
  },
  quota: {
    title: 'Limite diário da API do YouTube atingido',
    body: 'Nada foi alterado. Cada cancelamento gasta 50 unidades da quota diária do projeto. Tenta novamente amanhã.',
  },
  api_disabled: {
    title: 'A YouTube Data API não está ativada',
    body: 'Nada foi alterado. Ativa a YouTube Data API v3 no projeto Google Cloud.',
  },
  forbidden: {
    title: 'O YouTube recusou o cancelamento',
    body: 'Nada foi alterado. Confirma que autorizaste a gestão da conta e que escolheste o mesmo canal do YouTube com que entraste.',
  },
  subscription_not_found: {
    title: 'Esta subscrição já não existe no YouTube',
    body: 'Talvez já a tenhas cancelado noutro sítio. O canal foi retirado da lista; não conta como cancelamento desta sessão.',
  },
  no_channel: {
    title: 'Esta subscrição já não existe no YouTube',
    body: 'O canal foi retirado da lista.',
  },
  network: {
    title: 'Sem ligação ao YouTube',
    body: 'Não foi possível confirmar o cancelamento. Verifica a ligação e usa "Atualizar lista" para ver o estado real antes de tentar outra vez.',
  },
  inconsistent: {
    title: 'Não foi possível confirmar o cancelamento',
    body: 'Usa "Atualizar lista" para ver o estado real antes de tentar outra vez.',
  },
  server: {
    title: 'O YouTube teve um erro temporário',
    body: 'O cancelamento não foi confirmado. Tenta novamente dentro de momentos.',
  },
  unknown: {
    title: 'Não foi possível cancelar a subscrição',
    body: 'O cancelamento não foi confirmado. Usa "Atualizar lista" para ver o estado real antes de tentar outra vez.',
  },
};
