import { SITE_URL } from './site';

export const BADGE_STYLES = ['standard', 'compact', 'seal'] as const;
export const BADGE_THEMES = ['light', 'dark'] as const;

export type BadgeStyle = (typeof BADGE_STYLES)[number];
export type BadgeTheme = (typeof BADGE_THEMES)[number];

export interface BadgeInput {
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

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

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

function brandLine(): string {
  return '사이트다';
}

function statusLine(verified: boolean): string {
  return verified ? '인증된 등록 사이트' : '등록된 사이트';
}

/** Human-readable text used for the badge's alt/aria label. */
export function badgeAltText(siteName: string, verified: boolean): string {
  return `${siteName} · 사이트다 ${verified ? '인증된 등록 사이트' : '등록된 사이트'}`;
}

/**
 * Verified check tucked into the mark's bottom-right corner, ringed in the
 * badge background so it reads as sitting on top of the mark.
 */
function verifiedCheck(cx: number, cy: number, r: number, accent: string, ring: string): string {
  const s = r * 0.5;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r + 1.6}" fill="${ring}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}"/>` +
    `<path d="M${cx - s} ${cy + s * 0.05} l${s * 0.7} ${s * 0.72} L${cx + s} ${cy - s * 0.66}" ` +
    `fill="none" stroke="#ffffff" stroke-width="${r * 0.3}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function mark(x: number, y: number, size: number, glyphSize: number, p: Palette): string {
  return (
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${round(size * 0.28)}" fill="${p.markBg}"/>` +
    `<text x="${x + size / 2}" y="${y + size * 0.72}" font-family="${FONT_STACK}" font-size="${glyphSize}" ` +
    `font-weight="800" fill="${p.markFg}" text-anchor="middle">사</text>`
  );
}

function renderStandard(input: BadgeInput, p: Palette, title: string): string {
  const brand = brandLine();
  const status = statusLine(input.verified);
  const h = 52;
  const padX = 12;
  const markSize = 32;
  const markX = padX;
  const markY = 10;
  const dividerX = markX + markSize + 12;
  const textX = dividerX + 12;
  const brandSize = 13.5;
  const statusSize = 10.5;

  const textW = Math.max(textWidth(brand, brandSize, 700), textWidth(status, statusSize, 500));
  const w = Math.round(textX + textW + padX);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="8" fill="${p.bg}" stroke="${p.border}"/>
  ${mark(markX, markY, markSize, 19.5, p)}
  ${input.verified ? verifiedCheck(markX + markSize - 4, markY + markSize - 4, 6.5, p.accent, p.bg) : ''}
  <line x1="${dividerX}" y1="12" x2="${dividerX}" y2="40" stroke="${p.border}"/>
  <text x="${textX}" y="25" font-family="${FONT_STACK}" font-size="${brandSize}" font-weight="700" fill="${p.value}" letter-spacing="-0.1">${escapeXml(brand)}</text>
  <text x="${textX}" y="40" font-family="${FONT_STACK}" font-size="${statusSize}" font-weight="500" fill="${p.label}">${escapeXml(status)}</text>
</svg>`;
}

function renderCompact(input: BadgeInput, p: Palette, title: string): string {
  // A 32px badge has no room for both a mark and a check glyph, so the status
  // word itself carries the colour: accent when verified, muted when not.
  const word = input.verified ? '인증' : '등록';
  const full = `사이트다 ${word}`;
  const h = 32;
  const padX = 10;
  const markSize = 20;
  const markX = padX;
  const markY = 6;
  const textX = markX + markSize + 9;
  const fontSize = 11;

  const w = Math.round(textX + textWidth(full, fontSize, 600) + padX);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="6" fill="${p.bg}" stroke="${p.border}"/>
  ${mark(markX, markY, markSize, 12, p)}
  <text x="${textX}" y="21" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="600" letter-spacing="-0.1"><tspan fill="${p.value}">사이트다 </tspan><tspan fill="${input.verified ? p.accent : p.label}" font-weight="700">${word}</tspan></text>
</svg>`;
}

function renderSeal(input: BadgeInput, p: Palette, title: string): string {
  const size = 104;
  const c = size / 2;
  const status = input.verified ? '인증 완료' : '등록 완료';
  const markSize = 26;
  const markX = c - markSize / 2;
  const markY = 17;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <circle cx="${c}" cy="${c}" r="${c - 1}" fill="${p.bg}" stroke="${p.border}"/>
  <circle cx="${c}" cy="${c}" r="${c - 6}" fill="none" stroke="${p.border}" stroke-opacity="0.65"/>
  ${mark(markX, markY, markSize, 16, p)}
  ${input.verified ? verifiedCheck(markX + markSize - 3, markY + markSize - 3, 5.6, p.accent, p.bg) : ''}
  <text x="${c}" y="62" font-family="${FONT_STACK}" font-size="12.5" font-weight="700" fill="${p.value}" text-anchor="middle" letter-spacing="-0.2">사이트다</text>
  <line x1="${c - 15}" y1="70" x2="${c + 15}" y2="70" stroke="${p.border}"/>
  <text x="${c}" y="84" font-family="${FONT_STACK}" font-size="9.5" font-weight="500" fill="${p.label}" text-anchor="middle">${escapeXml(status)}</text>
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
