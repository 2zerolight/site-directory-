const PUNYCODE_BASE = 36;
const PUNYCODE_T_MIN = 1;
const PUNYCODE_T_MAX = 26;
const PUNYCODE_SKEW = 38;
const PUNYCODE_DAMP = 700;
const PUNYCODE_INITIAL_BIAS = 72;
const PUNYCODE_INITIAL_N = 128;

function punycodeDecodeDigit(codePoint: number): number {
  if (codePoint - 48 < 10) return codePoint - 22;
  if (codePoint - 65 < 26) return codePoint - 65;
  if (codePoint - 97 < 26) return codePoint - 97;
  return PUNYCODE_BASE;
}

function punycodeAdapt(delta: number, numPoints: number, firstTime: boolean): number {
  let d = firstTime ? Math.floor(delta / PUNYCODE_DAMP) : delta >> 1;
  d += Math.floor(d / numPoints);
  let k = 0;
  while (d > ((PUNYCODE_BASE - PUNYCODE_T_MIN) * PUNYCODE_T_MAX) >> 1) {
    d = Math.floor(d / (PUNYCODE_BASE - PUNYCODE_T_MIN));
    k += PUNYCODE_BASE;
  }
  return k + Math.floor(((PUNYCODE_BASE - PUNYCODE_T_MIN + 1) * d) / (d + PUNYCODE_SKEW));
}

function punycodeDecode(input: string): string {
  const output: number[] = [];
  let n = PUNYCODE_INITIAL_N;
  let i = 0;
  let bias = PUNYCODE_INITIAL_BIAS;

  let basic = input.lastIndexOf('-');
  if (basic < 0) basic = 0;
  for (let j = 0; j < basic; j++) output.push(input.charCodeAt(j));

  let index = basic > 0 ? basic + 1 : 0;
  while (index < input.length) {
    const oldi = i;
    for (let w = 1, k = PUNYCODE_BASE; ; k += PUNYCODE_BASE) {
      if (index >= input.length) throw new Error('invalid punycode input');
      const digit = punycodeDecodeDigit(input.charCodeAt(index++));
      if (digit >= PUNYCODE_BASE) throw new Error('invalid punycode input');
      i += digit * w;
      const t = k <= bias ? PUNYCODE_T_MIN : k >= bias + PUNYCODE_T_MAX ? PUNYCODE_T_MAX : k - bias;
      if (digit < t) break;
      w *= PUNYCODE_BASE - t;
    }
    const out = output.length + 1;
    bias = punycodeAdapt(i - oldi, out, oldi === 0);
    n += Math.floor(i / out);
    i %= out;
    output.splice(i, 0, n);
    i++;
  }

  return String.fromCodePoint(...output);
}

/** Decodes `xn--`-prefixed IDN hostname labels back to Unicode for display. */
export function decodeHostnameForDisplay(hostname: string): string {
  return hostname
    .split('.')
    .map((label) => {
      if (!label.toLowerCase().startsWith('xn--')) return label;
      try {
        return punycodeDecode(label.slice(4));
      } catch {
        return label;
      }
    })
    .join('.');
}

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
