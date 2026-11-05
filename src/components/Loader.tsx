export function Loader({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-spinner" aria-hidden="true" />
      <p className="loader-label">{label}</p>
      {detail && <p className="loader-detail">{detail}</p>}
    </div>
  );
}
