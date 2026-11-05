import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GOOGLE_CLIENT_ID } from '../config/env';
import { AuthError, toAuthError } from '../domain/errors';
import { prepareGoogleAuth, requestAccessToken, requestWriteToken, revokeToken } from './googleAuth';
import { consumeRedirectResult, startRedirect, prefersRedirectFlow } from './redirectAuth';

/**
 * D3.3.1: resposta de um login por redirecionamento (Android), lida uma única vez ao abrir a página.
 * No PC é sempre null (o PC usa a janela pop-up, como antes).
 */
const REDIRECT_RESULT = consumeRedirectResult();

/** Margem de segurança: consideramos a sessão expirada 1 minuto antes do fim real. */
const EXPIRY_MARGIN_MS = 60_000;

export type AuthState =
  | { status: 'signed-out' }
  | { status: 'signed-in'; expiresAt: number }
  | { status: 'expired' };

interface AuthContextValue {
  state: AuthState;
  /** A biblioteca da Google está carregada e o botão pode abrir o popup. */
  ready: boolean;
  /** Problema de configuração/carregamento que impede o login. */
  setupError: AuthError | null;
  /** O popup da Google está aberto, à espera de resposta. */
  busy: boolean;
  /** Último erro de login (recusa, popup fechado, etc.). */
  lastError: AuthError | null;
  /** Confirmação após terminar sessão: 'revoked' se o token foi revogado na Google. */
  justSignedOut: 'revoked' | 'ended' | null;

  signIn: () => void;
  signOut: () => Promise<void>;
  /** Token atual (só em memória) para a camada de API. null se não houver sessão. */
  getAccessToken: () => string | null;
  /** Marca a sessão como expirada (ex.: resposta 401 da API na Etapa C). */
  markExpired: () => void;
  retrySetup: () => void;
  dismissMessages: () => void;
  /**
   * D3.2: devolve um token com permissão de cancelar subscrições.
   * Se ainda não existir (ou tiver expirado), abre a janela da Google: tem de ser
   * chamado diretamente no clique de confirmação. Fica só em memória.
   */
  ensureWriteAccess: (channelId?: string) => Promise<string>;
  /** Android: canal cuja confirmação de cancelamento deve voltar a abrir depois da ida à Google. */
  pendingCancelChannelId: string | null;
  clearPendingCancel: () => void;
  /** Esquece o token de escrita (ex.: a API respondeu 401 a um cancelamento). */
  dropWriteAccess: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    REDIRECT_RESULT?.ok ? { status: 'signed-in', expiresAt: REDIRECT_RESULT.expiresAt } : { status: 'signed-out' },
  );
  const [ready, setReady] = useState(false);
  const [setupError, setSetupError] = useState<AuthError | null>(
    GOOGLE_CLIENT_ID ? null : new AuthError('config_missing'),
  );
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<AuthError | null>(() =>
    REDIRECT_RESULT && !REDIRECT_RESULT.ok ? REDIRECT_RESULT.error : null,
  );
  const [pendingCancelChannelId, setPendingCancelChannelId] = useState<string | null>(() =>
    REDIRECT_RESULT?.ok && REDIRECT_RESULT.purpose === 'write' ? (REDIRECT_RESULT.channelId ?? null) : null,
  );
  const [justSignedOut, setJustSignedOut] = useState<'revoked' | 'ended' | null>(null);
  const [setupAttempt, setSetupAttempt] = useState(0);

  // O token vive apenas aqui, em memória. Fechar o separador = fim da sessão.
  const tokenRef = useRef<string | null>(REDIRECT_RESULT?.ok ? REDIRECT_RESULT.token : null);
  // Token de escrita (cancelar subscrições): separado, só em memória, pedido só quando necessário.
  const writeTokenRef = useRef<{ value: string; expiresAt: number } | null>(
    REDIRECT_RESULT?.ok && REDIRECT_RESULT.purpose === 'write'
      ? { value: REDIRECT_RESULT.token, expiresAt: REDIRECT_RESULT.expiresAt }
      : null,
  );

  // Prepara a Google Identity Services assim que a app abre.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    setSetupError(null);
    prepareGoogleAuth()
      .then(() => !cancelled && setReady(true))
      .catch((err) => !cancelled && setSetupError(toAuthError(err)));
    return () => {
      cancelled = true;
    };
  }, [setupAttempt]);

  const markExpired = useCallback(() => {
    tokenRef.current = null;
    writeTokenRef.current = null;
    setState((s) => (s.status === 'signed-in' ? { status: 'expired' } : s));
  }, []);

  // Expiração: temporizador + verificação ao voltar ao separador
  // (os temporizadores podem atrasar com o ecrã bloqueado ou o separador em segundo plano).
  useEffect(() => {
    if (state.status !== 'signed-in') return;
    const deadline = state.expiresAt - EXPIRY_MARGIN_MS;
    const check = () => Date.now() >= deadline && markExpired();
    const timer = setTimeout(check, Math.max(0, deadline - Date.now()));
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state, markExpired]);

  const signIn = useCallback(() => {
    // Se o popup anterior ficou "perdido", um novo clique volta a abri-lo.
    if (!ready) return;
    setBusy(true);
    setLastError(null);
    setJustSignedOut(null);
    if (prefersRedirectFlow()) {
      // Android: a página vai à Google e volta (ver redirectAuth.ts).
      try {
        startRedirect('login');
      } catch (err) {
        setLastError(toAuthError(err));
        setBusy(false);
      }
      return;
    }
    // Chamada síncrona dentro do clique: evita o bloqueio do popup.
    requestAccessToken()
      .then((token) => {
        tokenRef.current = token.value;
        setState({ status: 'signed-in', expiresAt: token.expiresAt });
      })
      .catch((err) => setLastError(toAuthError(err)))
      .finally(() => setBusy(false));
  }, [ready]);

  const signOut = useCallback(async () => {
    const token = tokenRef.current;
    const writeToken = writeTokenRef.current?.value ?? null;
    tokenRef.current = null;
    writeTokenRef.current = null;
    setState({ status: 'signed-out' });
    setLastError(null);
    setJustSignedOut(token ? 'revoked' : 'ended');
    if (writeToken) await revokeToken(writeToken);
    if (token) await revokeToken(token);
  }, []);

  const ensureWriteAccess = useCallback((channelId?: string): Promise<string> => {
    const current = writeTokenRef.current;
    if (current && current.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return Promise.resolve(current.value);
    writeTokenRef.current = null;
    if (prefersRedirectFlow()) {
      // Android: vai à Google pedir a permissão e volta. NÃO cancela ao voltar:
      // a confirmação deste canal volta a abrir e o utilizador decide outra vez.
      try {
        startRedirect('write', channelId);
      } catch (err) {
        return Promise.reject(toAuthError(err));
      }
      return new Promise<string>(() => undefined); // a página sai daqui
    }
    // Chamada síncrona dentro do clique: evita o bloqueio do popup.
    return requestWriteToken().then((t) => {
      writeTokenRef.current = { value: t.value, expiresAt: t.expiresAt };
      return t.value;
    });
  }, []);

  const dropWriteAccess = useCallback(() => {
    writeTokenRef.current = null;
  }, []);

  const clearPendingCancel = useCallback(() => setPendingCancelChannelId(null), []);

  // Referência estável: a camada da API guarda esta função sem provocar recarregamentos.
  const getAccessToken = useCallback(() => tokenRef.current, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      ready,
      setupError,
      busy,
      lastError,
      justSignedOut,
      signIn,
      signOut,
      getAccessToken,
      markExpired,
      ensureWriteAccess,
      dropWriteAccess,
      pendingCancelChannelId,
      clearPendingCancel,
      retrySetup: () => setSetupAttempt((n) => n + 1),
      dismissMessages: () => {
        setLastError(null);
        setJustSignedOut(null);
      },
    }),
    [state, ready, setupError, busy, lastError, justSignedOut, signIn, signOut, getAccessToken, markExpired, ensureWriteAccess, dropWriteAccess, pendingCancelChannelId, clearPendingCancel],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>');
  return ctx;
}
