const numberFmt = new Intl.NumberFormat('pt-PT');

/**
 * Data sempre em DD/MM/AAAA (ex.: 09/12/2019), independentemente do browser.
 * Só altera a apresentação; o valor original da API não é modificado.
 */
export function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** "há 5 anos", "há 3 meses", "há menos de um mês". */
export function timeAgo(iso?: string, now = new Date()): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 1) return 'há menos de um mês';
  if (months < 12) return months === 1 ? 'há 1 mês' : `há ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'há 1 ano' : `há ${years} anos`;
}

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

/** Iniciais para o avatar de recurso quando não há imagem. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w[0] ?? ''));
  const letters = words.length > 1 ? [words[0][0], words[words.length - 1][0]] : [...(words[0] ?? '?').slice(0, 2)];
  return letters.join('').toUpperCase();
}

/** Cor estável (a partir do nome) para o avatar de recurso. */
export function hueFromString(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
}
