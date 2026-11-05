import { useState } from 'react';
import { hueFromString, initials } from '../utils/format';

/** Avatar do canal; se não houver imagem (ou falhar), mostra as iniciais. */
export function Avatar({ name, src, size = 56 }: { name: string; src?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (src && !failed) {
    return (
      <img
        className="avatar"
        src={src}
        alt=""
        style={style}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  const hue = hueFromString(name);
  return (
    <span
      className="avatar avatar--fallback"
      aria-hidden="true"
      style={{
        ...style,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 55% 38%), hsl(${(hue + 40) % 360} 60% 24%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}
