import { useAuth } from '../../auth/AuthContext';
import { CLIENT_ID_LOOKS_INVALID } from '../../config/env';
import { DemoBadge } from '../../components/DemoBadge';
import { Icon, type IconName } from '../../components/Icon';
import { LogoMark, Wordmark } from '../../components/Logo';
import { Notice } from '../../components/Notice';
import { AUTH_MESSAGES } from '../../domain/errors';
import { InstallPrompt, OfflineBanner, UpdateBanner } from '../../pwa/PwaUi';
import './landing.css';

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: 'users', text: 'Descobre quantos canais segues' },
  { icon: 'search', text: 'Encontra canais esquecidos' },
  { icon: 'check', text: 'Decide o que fica e o que sai' },
];

interface LandingProps {
  /** Entrada em modo DEMO (só disponível em desenvolvimento). */
  onDemo?: () => void;
}

export function Landing({ onDemo }: LandingProps) {
  return (
    <main className="landing">
      <UpdateBanner />
      <div className="landing-glow" aria-hidden="true" />
      <div className="landing-wave" aria-hidden="true" />

      <section className="landing-hero">
        <LogoMark size={112} className="landing-logo" />
        <h1 className="landing-title">
          <Wordmark />
        </h1>
        <p className="landing-slogan">Take back control of your YouTube.</p>

        <ul className="landing-benefits">
          {BENEFITS.map((b) => (
            <li key={b.text}>
              <span className="landing-benefit-icon">
                <Icon name={b.icon} size={24} />
              </span>
              {b.text}
            </li>
          ))}
        </ul>

        <ConnectBlock onDemo={onDemo} />
      </section>

      <section className="landing-art" aria-hidden="true">
        <div className="art-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className={`art-tile art-tile--${i % 4}`}>
              <span className="art-dot" />
              <span className="art-bar" />
              <span className="art-bar art-bar--short" />
            </div>
          ))}
        </div>
        <div className="art-sweep">
          <LogoMark size={88} />
        </div>
      </section>

      <footer className="landing-footer">
        Mais tempo para os canais que realmente importam. <span className="heart">♥</span>
      </footer>
    </main>
  );
}

/** Botão "Ligar ao YouTube" com todos os estados de autenticação. */
function ConnectBlock({ onDemo }: LandingProps) {
  const { ready, busy, setupError, lastError, justSignedOut, signIn, retrySetup, dismissMessages } = useAuth();

  const blocked = setupError !== null;
  const preparing = !ready && !blocked;

  let label = 'Ligar ao YouTube';
  if (preparing) label = 'A preparar ligação…';
  else if (busy) label = 'A aguardar a Google…';

  return (
    <div className="landing-cta">
      <OfflineBanner />
      {setupError && (
        <Notice tone="error" title={AUTH_MESSAGES[setupError.kind].title}>
          {setupError.kind === 'config_missing' ? (
            <>
              {CLIENT_ID_LOOKS_INVALID
                ? 'O valor de VITE_GOOGLE_CLIENT_ID não parece um Client ID válido (deve terminar em .apps.googleusercontent.com).'
                : 'Falta o Client ID no ficheiro .env.local.'}{' '}
              Segue o guia <code>docs/GOOGLE_CLOUD_SETUP.md</code> e reinicia o <code>npm run dev</code>.
            </>
          ) : (
            <>
              {AUTH_MESSAGES[setupError.kind].body}{' '}
              <button type="button" className="text-link" onClick={retrySetup}>
                Tentar outra vez
              </button>
            </>
          )}
        </Notice>
      )}

      {lastError && (
        <Notice tone="error" title={AUTH_MESSAGES[lastError.kind].title} onDismiss={dismissMessages}>
          {AUTH_MESSAGES[lastError.kind].body}
        </Notice>
      )}

      {justSignedOut && (
        <Notice tone="success" title="Sessão terminada" onDismiss={dismissMessages}>
          {justSignedOut === 'revoked'
            ? 'O acesso à tua conta foi revogado e nada ficou guardado neste dispositivo.'
            : 'Nada ficou guardado neste dispositivo.'}
        </Notice>
      )}

      <button
        type="button"
        className="btn btn--white btn--lg btn--block"
        onClick={signIn}
        disabled={blocked || preparing}
        aria-busy={busy || preparing}
      >
        {busy || preparing ? <span className="btn-spinner" aria-hidden="true" /> : <Icon name="link" size={22} />}
        {label}
      </button>

      <p className="landing-safety">
        <Icon name="lock" size={14} />
        Seguro, via Google
        <span className="landing-safety-sub">Não guardamos a tua password</span>
      </p>

      <InstallPrompt variant="inline" />

      {onDemo && (
        <p className="landing-demo-note">
          <DemoBadge />
          <button type="button" className="text-link" onClick={onDemo}>
            Ver demonstração com dados fictícios
          </button>
        </p>
      )}
    </div>
  );
}
