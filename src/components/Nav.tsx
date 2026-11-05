import { Icon, type IconName } from './Icon';
import { LogoMark, Wordmark } from './Logo';

export type Tab = 'home' | 'cleanup' | 'channels';

interface NavItem {
  id: Tab | 'stats';
  label: string;
  icon: IconName;
  /** Itens de fases futuras: visíveis mas desativados. */
  soon?: boolean;
}

const ITEMS: NavItem[] = [
  { id: 'home', label: 'Início', icon: 'home' },
  { id: 'cleanup', label: 'Limpeza', icon: 'broom' },
  { id: 'channels', label: 'Canais', icon: 'list' },
  { id: 'stats', label: 'Estatísticas', icon: 'chart', soon: true },
];

interface NavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  onLogout: () => void;
}

function NavButtons({ active, onChange, variant }: Omit<NavProps, 'onLogout'> & { variant: 'bottom' | 'side' }) {
  return (
    <>
      {ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            className={`nav-item nav-item--${variant}${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            disabled={item.soon}
            title={item.soon ? 'Disponível numa próxima fase' : undefined}
            onClick={() => !item.soon && onChange(item.id as Tab)}
          >
            <Icon name={item.icon} size={variant === 'bottom' ? 24 : 20} />
            <span className="nav-label">{item.label}</span>
            {item.soon && variant === 'side' && <span className="nav-soon">Em breve</span>}
          </button>
        );
      })}
    </>
  );
}

/** Navegação inferior (mobile e tablet). */
export function BottomNav(props: Omit<NavProps, 'onLogout'>) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <NavButtons {...props} variant="bottom" />
    </nav>
  );
}

/** Barra lateral (desktop). */
export function Sidebar({ onLogout, ...props }: NavProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <LogoMark size={36} />
        <Wordmark />
      </div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        <NavButtons {...props} variant="side" />
      </nav>
      <button type="button" className="sidebar-logout" onClick={onLogout}>
        <Icon name="logout" size={20} />
        Terminar sessão
      </button>
    </aside>
  );
}
