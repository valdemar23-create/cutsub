import { CANCEL_MODE } from '../config/env';

const timeFmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });

/**
 * Indica, sem ambiguidade, que os dados são REAIS e o que a app pode fazer:
 * - o acesso normal é só de leitura;
 * - os cancelamentos são simulados (por defeito) ou reais (se configurado), sempre um a um, com confirmação.
 */
export function LiveBanner({ sessionExpiresAt }: { sessionExpiresAt?: number }) {
  return (
    <div className="live-banner" role="status">
      <span className="live-dot" aria-hidden="true" />
      <span>
        <strong>Dados reais do teu YouTube</strong> · acesso de leitura
        {CANCEL_MODE === 'real' ? (
          <>
            {' '}
            · <strong className="live-banner-real">cancelamento real ativo</strong> (cada canal pede confirmação e
            autorização da Google)
          </>
        ) : (
          <> · cancelamentos simulados (nada muda no YouTube)</>
        )}
        {sessionExpiresAt ? ` · sessão válida até ${timeFmt.format(sessionExpiresAt)}` : ''}
      </span>
    </div>
  );
}
