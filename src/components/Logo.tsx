/** Identidade CutSub: símbolo independente e nome legível em tamanhos pequenos. */
export function LogoMark({ size = 48, className }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="CutSub">
    <path d="M10 16 Q10 10 17 10 H47 Q54 10 54 17 V47 Q54 54 47 54 H17 Q10 54 10 47 Z" fill="#ed3448"/>
    <path d="M26 20 L46 32 L26 44 Z" fill="#ffffff"/>
    <path d="M5 49 Q31 65 59 36" fill="none" stroke="#1baee6" strokeWidth="5" strokeLinecap="round"/>
  </svg>;
}
export function Wordmark({ className }: { className?: string }) {
  return <span className={`wordmark ${className ?? ''}`} style={{letterSpacing:'-.04em',fontWeight:800}}><span style={{color:'#173456'}}>Cut</span><span style={{color:'#168be0'}}>Sub</span></span>;
}
