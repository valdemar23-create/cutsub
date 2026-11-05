import { useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '../../components/Icon';
import { Notice } from '../../components/Notice';
import { backupFilename, buildBackup, parseBackup, summarize, type ParsedBackup, type StorageMode } from '../../services/backup';
import { formatDate, formatNumber } from '../../utils/format';
import type { ReviewStore } from '../cleanup/useReviewStore';
import './backup.css';

type Pending = Extract<ParsedBackup, { ok: true }> & { fileName: string };

/** Exportar / importar as decisões locais (sem tokens). */
export function BackupPanel({ store, storageMode }: { store: ReviewStore; storageMode: StorageMode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; title: string; body?: string } | null>(null);
  const current = summarize(store.reviews);

  const exportBackup = () => {
    const now = new Date();
    const blob = new Blob([JSON.stringify(buildBackup(store.reviews, storageMode, now), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename(storageMode, now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ tone: 'success', title: 'Backup exportado', body: `${formatNumber(current.total)} canais com decisão ou categoria manual.` });
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMessage(null);
    setPending(null);
    const parsed = parseBackup(await file.text(), storageMode);
    if (!parsed.ok) {
      setMessage({ tone: 'error', title: 'Não foi possível importar o backup', body: parsed.error });
      return;
    }
    setPending({ ...parsed, fileName: file.name });
  };

  const confirmImport = () => {
    if (!pending) return;
    store.replaceAll(pending.reviews);
    setMessage({ tone: 'success', title: 'Backup importado', body: `${formatNumber(pending.summary.total)} canais restaurados.` });
    setPending(null);
  };

  return (
    <section className="backup card" aria-labelledby="backup-title">
      <div className="backup-head">
        <div>
          <h2 id="backup-title" className="backup-title">
            Cópia de segurança
          </h2>
          <p className="backup-sub">
            Decisões e categorias manuais deste browser ({formatNumber(current.total)} canais). O ficheiro não contém
            tokens nem dados da tua conta Google.
          </p>
        </div>
        <div className="backup-actions">
          <button type="button" className="btn btn--ghost" onClick={exportBackup}>
            <Icon name="external" size={16} />
            Exportar backup
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => inputRef.current?.click()}>
            <Icon name="arrowLeft" size={16} />
            Importar backup
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-label="Escolher ficheiro de backup"
            onChange={onFile}
          />
        </div>
      </div>

      {pending && (
        <div className="backup-confirm" role="alertdialog" aria-labelledby="backup-confirm-title">
          <p id="backup-confirm-title" className="backup-confirm-title">
            Substituir as decisões atuais?
          </p>
          <p>
            <strong>{pending.fileName}</strong>
            {pending.exportedAt && <> · exportado em {formatDate(pending.exportedAt)}</>}
          </p>
          <ul className="backup-compare">
            <li>
              No ficheiro: <strong>{formatNumber(pending.summary.total)}</strong> canais ({pending.summary.keep} Manter ·{' '}
              {pending.summary.maybe} Talvez · {pending.summary.remove} Remover · {pending.summary.manualCategories}{' '}
              categorias manuais)
            </li>
            <li>
              Atualmente: <strong>{formatNumber(current.total)}</strong> canais ({current.keep} Manter · {current.maybe}{' '}
              Talvez · {current.remove} Remover · {current.manualCategories} categorias manuais)
            </li>
          </ul>
          <p className="backup-warn">As decisões atuais serão substituídas pelas do ficheiro. Não afeta o YouTube.</p>
          <div className="backup-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setPending(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn--accent" onClick={confirmImport}>
              Substituir decisões
            </button>
          </div>
        </div>
      )}

      {message && (
        <Notice tone={message.tone} title={message.title} onDismiss={() => setMessage(null)}>
          {message.body}
        </Notice>
      )}
    </section>
  );
}
