/** Etiqueta bem visível para dados fictícios. */
export function DemoBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={`demo-badge demo-badge--${size}`} title="Dados fictícios para teste visual">
      DEMO
    </span>
  );
}

const timeFmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });

/**
 * Faixa no topo da app enquanto a fonte de dados for DEMO.
 * Com sessão Google ativa (Etapa B), confirma a ligação mas deixa claro
 * que os canais ainda são fictícios.
 */
export function DemoBanner({ sessionExpiresAt }: { sessionExpiresAt?: number }) {
  return (
    <div className="demo-banner" role="status">
      <DemoBadge />
      {sessionExpiresAt ? (
        <span>
          <strong className="demo-banner-ok">Ligado à Google (só leitura)</strong> · sessão válida até{' '}
          {timeFmt.format(sessionExpiresAt)}. Os canais abaixo ainda são fictícios.
        </span>
      ) : (
        <span>Dados fictícios para teste visual. Ainda não há ligação ao YouTube.</span>
      )}
    </div>
  );
}
