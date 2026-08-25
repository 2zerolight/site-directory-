import { SITE_URL } from './site';

export const BADGE_STYLES = ['standard', 'compact', 'seal'] as const;
export const BADGE_THEMES = ['light', 'dark'] as const;

export type BadgeStyle = (typeof BADGE_STYLES)[number];
export type BadgeTheme = (typeof BADGE_THEMES)[number];

export interface BadgeInput {
  /** Display hostname, already IDN-decoded. */
  hostname: string;
  /** Only a real `ownership_verified` row may claim "인증". */
  verified: boolean;
  style: BadgeStyle;
  theme: BadgeTheme;
}

export function parseBadgeStyle(raw: string | null): BadgeStyle {
  return (BADGE_STYLES as readonly string[]).includes(raw ?? '') ? (raw as BadgeStyle) : 'standard';
}

export function parseBadgeTheme(raw: string | null): BadgeTheme {
  return (BADGE_THEMES as readonly string[]).includes(raw ?? '') ? (raw as BadgeTheme) : 'light';
}

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif";

interface Palette {
  bg: string;
  border: string;
  markBg: string;
  markFg: string;
  label: string;
  value: string;
  accent: string;
}

const PALETTES: Record<BadgeTheme, Palette> = {
  light: {
    bg: '#ffffff',
    border: '#e2e8f0',
    markBg: '#0f172a',
    markFg: '#ffffff',
    label: '#64748b',
    value: '#0f172a',
    accent: '#2563eb',
  },
  dark: {
    bg: '#0f172a',
    border: '#334155',
    markBg: '#ffffff',
    markFg: '#0f172a',
    label: '#94a3b8',
    value: '#f8fafc',
    accent: '#60a5fa',
  },
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Rough advance-width estimate. The badge ships as a standalone SVG rendered by
 * whatever font the visitor's OS resolves, so exact metrics are unknowable —
 * we only need enough accuracy to keep text off the border.
 */
function textWidth(text: string, fontSize: number, weight: number): number {
  let units = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0x2e80) units += 1;
    else if (/[iljtfrI.,:;'`|!\[\]()]/.test(ch)) units += 0.33;
    else if (/[A-Z0-9@#%&]/.test(ch)) units += 0.62;
    else if (/[mwMW]/.test(ch)) units += 0.85;
    else units += 0.54;
  }
  return units * fontSize * (weight >= 600 ? 1.03 : 1);
}

function statusLabel(verified: boolean): string {
  return verified ? '사이트다 소유권 인증' : '사이트다 등록 사이트';
}

/** Human-readable text used for the badge's alt/aria label. */
export function badgeAltText(siteName: string, verified: boolean): string {
  return verified ? `사이트다 소유권 인증 사이트 — ${siteName}` : `사이트다 등록 사이트 — ${siteName}`;
}

function checkMark(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.52;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>` +
    `<path d="M${cx - s} ${cy} l${s * 0.72} ${s * 0.72} L${cx + s} ${cy - s * 0.62}" ` +
    `fill="none" stroke="#ffffff" stroke-width="${r * 0.28}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function renderStandard(input: BadgeInput, p: Palette, title: string): string {
  const label = statusLabel(input.verified);
  const h = 56;
  const markSize = 34;
  const padX = 11;
  const gap = 10;
  const labelSize = 10.5;
  const hostSize = 13;
  const checkSlot = input.verified ? 26 : 0;

  const textW = Math.max(textWidth(label, labelSize, 500), textWidth(input.hostname, hostSize, 600));
  const w = Math.round(padX + markSize + gap + textW + checkSlot + padX);
  const textX = padX + markSize + gap;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="9" fill="${p.bg}" stroke="${p.border}"/>
  <rect x="${padX}" y="${(h - markSize) / 2}" width="${markSize}" height="${markSize}" rx="9" fill="${p.markBg}"/>
  <text x="${padX + markSize / 2}" y="${h / 2 + 7.5}" font-family="${FONT_STACK}" font-size="21" font-weight="800" fill="${p.markFg}" text-anchor="middle">사</text>
  <text x="${textX}" y="24" font-family="${FONT_STACK}" font-size="${labelSize}" font-weight="500" fill="${p.label}" letter-spacing="0.2">${escapeXml(label)}</text>
  <text x="${textX}" y="40" font-family="${FONT_STACK}" font-size="${hostSize}" font-weight="600" fill="${p.value}">${escapeXml(input.hostname)}</text>
  ${input.verified ? checkMark(w - padX - 8, h / 2, 8, p.accent) : ''}
</svg>`;
}

function renderCompact(input: BadgeInput, p: Palette, title: string): string {
  const label = input.verified ? '사이트다 인증' : '사이트다 등록';
  const h = 34;
  const markSize = 20;
  const padX = 9;
  const gap = 7;
  const fontSize = 11.5;
  const checkSlot = input.verified ? 20 : 0;

  const w = Math.round(padX + markSize + gap + textWidth(label, fontSize, 600) + checkSlot + padX);
  const textX = padX + markSize + gap;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="7" fill="${p.bg}" stroke="${p.border}"/>
  <rect x="${padX}" y="${(h - markSize) / 2}" width="${markSize}" height="${markSize}" rx="5.5" fill="${p.markBg}"/>
  <text x="${padX + markSize / 2}" y="${h / 2 + 4.5}" font-family="${FONT_STACK}" font-size="12.5" font-weight="800" fill="${p.markFg}" text-anchor="middle">사</text>
  <text x="${textX}" y="${h / 2 + 4}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="600" fill="${p.value}">${escapeXml(label)}</text>
  ${input.verified ? checkMark(w - padX - 6.5, h / 2, 6.5, p.accent) : ''}
</svg>`;
}

function renderSeal(input: BadgeInput, p: Palette, title: string): string {
  const size = 108;
  const label = input.verified ? '소유권 인증' : '등록 사이트';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="14" fill="${p.bg}" stroke="${p.border}"/>
  <rect x="5.5" y="5.5" width="${size - 11}" height="${size - 11}" rx="10" fill="none" stroke="${p.border}" stroke-dasharray="3 3"/>
  <rect x="${size / 2 - 15}" y="16" width="30" height="30" rx="8" fill="${p.markBg}"/>
  <text x="${size / 2}" y="38" font-family="${FONT_STACK}" font-size="19" font-weight="800" fill="${p.markFg}" text-anchor="middle">사</text>
  <text x="${size / 2}" y="64" font-family="${FONT_STACK}" font-size="12.5" font-weight="700" fill="${p.value}" text-anchor="middle">${escapeXml(label)}</text>
  <text x="${size / 2}" y="79" font-family="${FONT_STACK}" font-size="10" font-weight="500" fill="${p.label}" text-anchor="middle">사이트다</text>
  <line x1="30" y1="86" x2="${size - 30}" y2="86" stroke="${p.border}"/>
  <text x="${size / 2}" y="98" font-family="${FONT_STACK}" font-size="8.5" font-weight="500" fill="${p.label}" text-anchor="middle" letter-spacing="0.4">siteda.kr</text>
</svg>`;
}

export function renderBadgeSvg(input: BadgeInput, title: string): string {
  const palette = PALETTES[input.theme];
  if (input.style === 'compact') return renderCompact(input, palette, title);
  if (input.style === 'seal') return renderSeal(input, palette, title);
  return renderStandard(input, palette, title);
}

export function badgeImageUrl(slug: string, style: BadgeStyle, theme: BadgeTheme): string {
  const params = new URLSearchParams();
  if (style !== 'standard') params.set('style', style);
  if (theme !== 'light') params.set('theme', theme);
  const qs = params.toString();
  return `${SITE_URL}/badge/${encodeURIComponent(slug)}.svg${qs ? `?${qs}` : ''}`;
}

export function badgeLinkUrl(slug: string): string {
  return `${SITE_URL}/site/${encodeURIComponent(slug)}`;
}
