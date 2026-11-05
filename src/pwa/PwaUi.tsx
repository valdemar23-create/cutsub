import { useState } from 'react';
import { Icon } from '../components/Icon';
import { applyUpdate, promptInstall, usePwa } from './pwa';
import './pwa.css';

/** "Sem ligação": a app abre, mas não consegue falar com o YouTube. */
export function OfflineBanner() {
  const { offline } = usePwa();
  if (!offline) return null;
  return (
    <div className="pwa-banner pwa-banner--offline" role="status">
      <Icon name="info" size={18} />
      <span>
        <strong>Sem ligação à internet.</strong> A CutSub precisa de internet para entrar, consultar e cancelar
        subscrições. As tuas decisões continuam guardadas neste dispositivo.
      </span>
    </div>
  );
}

/** Nova versão disponível. Desativado enquanto um cancelamento ou atualização da lista decorre. */
export function UpdateBanner({ busy = false }: { busy?: boolean }) {
  const { updateReady } = usePwa();
  if (!updateReady) return null;
  return (
    <div className="pwa-update" role="status">
      <span>
        <strong>Há uma nova versão da CutSub.</strong> As tuas decisões ficam guardadas.
      </span>
      <button type="button" className="btn btn--white pwa-update-btn" onClick={applyUpdate} disabled={busy}>
        {busy ? 'Aguarda…' : 'Atualizar agora'}
      </button>
    </div>
  );
}

/** Botão "Instalar a CutSub" (quando o browser o permite) ou instruções para iPhone/iPad. */
export function InstallPrompt({ variant = 'card' }: { variant?: 'card' | 'inline' }) {
  const { canInstall, standalone, iosHint, justInstalled } = usePwa();
  const [dismissed, setDismissed] = useState(false);
  if (standalone || dismissed) return null;

  if (justInstalled) {
    return variant === 'card' ? (
      <section className="pwa-card card" role="status">
        <p className="pwa-card-title">CutSub instalada</p>
        <p className="pwa-card-text">Já a podes abrir pelo ícone, como uma app.</p>
      </section>
    ) : null;
  }

  if (!canInstall && !iosHint) return null;

  if (variant === 'inline') {
    return canInstall ? (
      <button type="button" className="text-link pwa-inline" onClick={() => void promptInstall()}>
        Instalar a CutSub neste dispositivo
      </button>
    ) : (
      <p className="pwa-inline-hint">No iPhone/iPad: Partilhar → «Adicionar ao ecrã principal».</p>
    );
  }

  return (
    <section className="pwa-card card" aria-labelledby="pwa-card-title">
      <div>
        <p id="pwa-card-title" className="pwa-card-title">
          Instalar a CutSub
        </p>
        <p className="pwa-card-text">
          Abre a CutSub pelo ícone, numa janela própria. Precisa sempre de internet para falar com o YouTube. Cada
          dispositivo guarda as suas decisões: usa «Exportar backup» / «Importar backup» para as passar de um para outro.
        </p>
        {iosHint && !canInstall && (
          <p className="pwa-card-text">
            <strong>iPhone/iPad:</strong> no Safari, toca em Partilhar e depois em «Adicionar ao ecrã principal».
          </p>
        )}
      </div>
      <div className="pwa-card-actions">
        {canInstall && (
          <button type="button" className="btn btn--accent" onClick={() => void promptInstall()}>
            <Icon name="external" size={16} />
            Instalar
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => setDismissed(true)}>
          Agora não
        </button>
      </div>
    </section>
  );
}
