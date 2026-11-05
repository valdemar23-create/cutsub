import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { LogoMark } from '../../components/Logo';
import { Notice } from '../../components/Notice';
import { AUTH_MESSAGES } from '../../domain/errors';
import './session.css';

/** Mostrado quando o token da Google expira (cerca de 1 hora). */
export function SessionExpired() {
  const { busy, lastError, signIn, signOut, dismissMessages } = useAuth();

  return (
    <main className="session-screen">
      <div className="session-card card">
        <LogoMark size={64} />
        <h1 className="session-title">A tua sessão expirou</h1>
        <p className="session-text">
          Por segurança, a ligação à Google dura cerca de uma hora. Volta a ligar para continuares onde estavas.
        </p>

        {lastError && (
          <Notice tone="error" title={AUTH_MESSAGES[lastError.kind].title} onDismiss={dismissMessages}>
            {AUTH_MESSAGES[lastError.kind].body}
          </Notice>
        )}

        <button type="button" className="btn btn--white btn--lg btn--block" onClick={signIn} aria-busy={busy}>
          {busy ? <span className="btn-spinner" aria-hidden="true" /> : <Icon name="link" size={22} />}
          {busy ? 'A aguardar a Google…' : 'Voltar a ligar'}
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={() => void signOut()}>
          Terminar sessão
        </button>
      </div>
    </main>
  );
}
