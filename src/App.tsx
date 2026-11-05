import { useMemo, useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { IS_DEV } from './config/env';
import { demoSource } from './data/demoSource';
import { createYoutubeSource } from './data/youtubeSource';
import { AppShell } from './features/home/AppShell';
import { Landing } from './features/landing/Landing';
import { SessionExpired } from './features/session/SessionExpired';

/**
 * Etapa C: depois do login, os canais vêm da YouTube Data API (só leitura).
 * O modo DEMO continua disponível apenas em desenvolvimento e nunca se mistura com dados reais.
 */
export default function App() {
  const auth = useAuth();
  const [demoOnly, setDemoOnly] = useState(false);
  const { getAccessToken } = auth;

  // Uma fonte por sessão: os dados são carregados uma vez após cada login.
  const signedInAt = auth.state.status === 'signed-in' ? auth.state.expiresAt : null;
  const youtubeSource = useMemo(
    () => (signedInAt === null ? null : createYoutubeSource(getAccessToken)),
    [signedInAt, getAccessToken],
  );

  if (auth.state.status === 'expired') {
    return <SessionExpired />;
  }

  if (auth.state.status === 'signed-in' && youtubeSource) {
    return (
      <AppShell
        source={youtubeSource}
        sessionExpiresAt={auth.state.expiresAt}
        onLogout={() => void auth.signOut()}
        onUnauthorized={auth.markExpired}
        onSimulateExpiry={IS_DEV ? auth.markExpired : undefined}
      />
    );
  }

  // Modo DEMO sem conta Google (só em desenvolvimento).
  if (demoOnly) {
    return <AppShell source={demoSource} onLogout={() => setDemoOnly(false)} />;
  }

  return <Landing onDemo={IS_DEV ? () => setDemoOnly(true) : undefined} />;
}
