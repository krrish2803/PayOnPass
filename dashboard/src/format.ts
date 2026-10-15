export function usd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  const sign = cents < 0 ? '-' : '';
  const v = Math.abs(cents);
  return `${sign}$${(v / 100).toFixed(2)}`;
}

export function bp(points: number | null | undefined): string {
  if (points === null || points === undefined) return '—';
  return `${(points / 100).toFixed(2)}%`;
}

export function short(hash?: string | null, n = 12): string {
  if (!hash) return '—';
  return hash.length > n ? `${hash.slice(0, n)}…` : hash;
}

export function stateBadge(state: string): string {
  return state || '—';
}
