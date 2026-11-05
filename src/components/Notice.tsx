import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface NoticeProps {
  tone: 'error' | 'info' | 'success';
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
}

/** Mensagem amigável (erro, informação ou confirmação). */
export function Notice({ tone, title, children, onDismiss }: NoticeProps) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={tone === 'success' ? 'check' : 'info'} size={20} className="notice-icon" />
      <div className="notice-body">
        <p className="notice-title">{title}</p>
        {children && <div className="notice-text">{children}</div>}
      </div>
      {onDismiss && (
        <button type="button" className="notice-close" onClick={onDismiss} aria-label="Fechar mensagem">
          ×
        </button>
      )}
    </div>
  );
}
