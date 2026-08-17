export function withDefaultProtocol(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeRequiredUrl(raw: string): URL | null {
  try {
    const u = new URL(withDefaultProtocol(raw));
    return ['http:', 'https:'].includes(u.protocol) ? u : null;
  } catch {
    return null;
  }
}

export function normalizeOptionalUrl(raw: string): { ok: boolean; value: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  try {
    const u = new URL(withDefaultProtocol(trimmed));
    return ['http:', 'https:'].includes(u.protocol) ? { ok: true, value: u.toString() } : { ok: false, value: null };
  } catch {
    return { ok: false, value: null };
  }
}
