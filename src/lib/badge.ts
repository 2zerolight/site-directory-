import { SITE_URL } from './site';

export const BADGE_STYLES = ['standard', 'compact', 'seal'] as const;
export const BADGE_THEMES = ['light', 'dark'] as const;

export type BadgeStyle = (typeof BADGE_STYLES)[number];
export type BadgeTheme = (typeof BADGE_THEMES)[number];

export interface BadgeInput {
  /** 소유권 인증된 사이트만 체크와 애니메이션을 받는다. */
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

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const WORDMARK = 'SITEDA.KR';

/**
 * 월계관 잎 14장(좌우 7쌍). 반지름 15.5의 호 위에 잎의 *중심*을 얹어 서로 겹치게
 * 배치했다. 잎 밑동을 호에 붙이면 바깥으로만 뻗어 가시관처럼 보이고 월계관으로
 * 안 읽힌다 — 월계관 느낌은 겹쳐서 생기는 덩어리감에서 나온다.
 * 좌표는 56x52 기준. 승인된 시안과 픽셀 단위로 같게 두려고 상수로 박았다.
 */
const LEAVES = [
  'M27.79 41.17Q24.57 37.55 21.14 40.98Q24.4 43.33 27.79 41.17Z',
  'M23.3 40.4Q21.28 35.6 16.6 37.9Q19.1 41.42 23.3 40.4Z',
  'M18.5 37.69Q18.42 32.42 13.17 32.81Q14.18 37.06 18.5 37.69Z',
  'M15.36 33.93Q16.9 29.17 12.06 27.91Q11.67 32.04 15.36 33.93Z',
  'M13.63 29.2Q16.29 25.64 12.59 23.19Q11.07 26.55 13.63 29.2Z',
  'M13.81 23.37Q16.98 21.45 14.89 18.4Q12.66 20.52 13.81 23.37Z',
  'M15.86 18.76Q18.68 18.15 17.91 15.38Q15.74 16.37 15.86 18.76Z',
  'M28.21 41.17Q31.64 44.6 34.86 40.98Q31.47 38.82 28.21 41.17Z',
  'M32.7 40.4Q37.37 42.71 39.4 37.9Q35.2 36.88 32.7 40.4Z',
  'M37.5 37.69Q42.75 38.08 42.83 32.81Q38.51 33.44 37.5 37.69Z',
  'M40.64 33.93Q45.48 32.67 43.94 27.91Q40.25 29.8 40.64 33.93Z',
  'M42.37 29.2Q46.08 26.75 43.41 23.19Q40.86 25.84 42.37 29.2Z',
  'M42.19 23.37Q44.28 20.31 41.11 18.4Q39.97 21.25 42.19 23.37Z',
  'M40.14 18.76Q40.91 15.98 38.09 15.38Q37.96 17.76 40.14 18.76Z',
] as const;

/** 왼쪽 끝 -> 꺾임 -> 오른쪽 끝. 월계관이 아래로 쏠려 있어 체크도 1.8 내려 앉혔다. */
const CHECK_PATH = 'M23.53 28.07l3.13 3.22L32.47 24.58';

/**
 * 체크 두 획의 길이 비. 왼쪽(내려긋기) 4.49 : 오른쪽(올려긋기) 8.88 이라
 * 꺾임점이 경로의 33.6% 지점이고, pathLength=1 기준 dashoffset 0.664다.
 * 이 지점에서 이징이 갈린다.
 */
const CORNER_OFFSET = 0.664;

/**
 * 잎 경로가 놓인 56x52 박스 안에서 실제 잉크가 차지하는 영역(getBBox 실측).
 * 박스 기준으로 배치하면 왼쪽에 12, 아래로 3만큼 빈 공간이 딸려와 여백이 어긋난다.
 * 그래서 모든 배치는 이 잉크 박스를 기준으로 한다.
 */
const INK_X = 12.02;
const INK_Y = 15.38;
const INK_W = 32.51;
const INK_H = 27.46;

/**
 * 워드마크는 `textLength`로 폭을 고정한다. 배지는 방문자 기기의 폰트로 렌더링되는
 * 독립 SVG라, 폭을 계산에 맡기면 기기마다 여백이 달라진다. 아래 값은 macOS에서
 * 잰 자연폭(9pt/자간1.3 = 62.5)에 가깝게 잡아 자간만 미세 조정되도록 한 것이다.
 */
const WORDMARK_LENGTH: Record<number, number> = { 9: 61, 8: 54 };

interface Palette {
  bg: string;
  border: string;
  ink: string;
  word: string;
  hairline: string;
}

const PALETTES: Record<BadgeTheme, Palette> = {
  light: { bg: '#ffffff', border: '#e2e8f0', ink: '#0f172a', word: '#0f172a', hairline: '#cbd5e1' },
  dark: { bg: '#0f172a', border: '#334155', ink: '#f8fafc', word: '#f8fafc', hairline: '#475569' },
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

/** 배지에는 한글이 없으므로 의미는 alt 텍스트가 담는다. */
export function badgeAltText(siteName: string, verified: boolean): string {
  return `${siteName} · 사이트다 ${verified ? '인증된 등록 사이트' : '등록된 사이트'}`;
}

/**
 * 체크가 왼쪽 끝에서 오른쪽 끝으로 그려지고, 유지했다가 0.15초 디졸브로 사라진 뒤
 * 반복한다. 왼쪽 획은 등속으로 긋다가 꺾임점부터 오른쪽 획이 빨라진다 — 시간은
 * 62:38로 나누는데 길이 비가 34:66이라 오른쪽이 약 3.2배 빠르다.
 *
 * `<img>`로 넣어도 SVG 내부의 CSS 애니메이션은 실행된다(JS만 차단된다).
 * 모션 최소화를 켠 방문자에게는 완성된 체크로 고정해 보여준다.
 */
function animationCss(): string {
  const cycle = 5;
  const drawEnd = 42;
  const cornerAt = round(drawEnd * 0.62);
  const holdEnd = 86;
  const fadeEnd = round(holdEnd + (0.15 / cycle) * 100);
  const P = '%';

  return (
    `.ck{stroke-dasharray:1;stroke-dashoffset:1;animation:sdck ${cycle}s infinite}` +
    `@keyframes sdck{` +
    `0${P}{stroke-dashoffset:1;opacity:1;animation-timing-function:linear}` +
    `${cornerAt}${P}{stroke-dashoffset:${CORNER_OFFSET};animation-timing-function:cubic-bezier(0,.85,.25,1)}` +
    `${drawEnd}${P}{stroke-dashoffset:0;opacity:1;animation-timing-function:linear}` +
    `${holdEnd}${P}{stroke-dashoffset:0;opacity:1}` +
    `${fadeEnd}${P}{stroke-dashoffset:0;opacity:0}` +
    `99.99${P}{stroke-dashoffset:1;opacity:0}` +
    `100${P}{stroke-dashoffset:1;opacity:1}}` +
    `@media (prefers-reduced-motion:reduce){.ck{animation:none;stroke-dashoffset:0}}`
  );
}

/**
 * 인증된 곳은 잎을 채우고 체크를 그린다. 인증이 없거나 취소된 경우 같은 실루엣을
 * 선으로만 그리고 체크를 뺀다 — 이미 남의 사이트에 붙어 있는 배지가 깨진 이미지가
 * 되지 않으면서, 인증 상태를 사실대로 낮춰 보여주기 위해서다.
 */
function emblem(input: BadgeInput, p: Palette, inkX: number, inkY: number, scale: number): string {
  const paint = input.verified
    ? `fill="${p.ink}"`
    : `fill="none" stroke="${p.ink}" stroke-width="${round(0.9 / scale)}" stroke-opacity="0.55" stroke-linejoin="round"`;
  const leaves = LEAVES.map((d) => `<path d="${d}"/>`).join('');
  const check = input.verified
    ? `<path class="ck" pathLength="1" d="${CHECK_PATH}" fill="none" stroke="${p.ink}" ` +
      `stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
    : '';

  // 잉크의 좌상단이 (inkX, inkY)에 오도록 박스 여백만큼 되민다.
  const tx = inkX - INK_X * scale;
  const ty = inkY - INK_Y * scale;
  return (
    `<g transform="translate(${round(tx)} ${round(ty)}) scale(${round(scale)})">` +
    `<g ${paint}>${leaves}</g>${check}</g>`
  );
}

function wordmark(x: number, y: number, fontSize: number, fill: string): string {
  return (
    `<text x="${round(x)}" y="${round(y)}" font-family="${FONT_STACK}" font-size="${fontSize}" ` +
    `font-weight="700" fill="${fill}" textLength="${WORDMARK_LENGTH[fontSize]}" ` +
    `lengthAdjust="spacing">${WORDMARK}</text>`
  );
}

function svgOpen(w: number, h: number, title: string, input: BadgeInput): string {
  const style = input.verified ? `\n  <style>${animationCss()}</style>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
    `role="img" aria-label="${escapeXml(title)}">\n  <title>${escapeXml(title)}</title>${style}`
  );
}

/** 가로 락업: 엠블럼, 헤어라인, 워드마크. 좌우 여백을 잉크 기준으로 맞춘다. */
function renderStandard(input: BadgeInput, p: Palette, title: string): string {
  const h = 34;
  const pad = 11;
  const gap = 10;
  const inkH = 20;
  const scale = inkH / INK_H;
  const inkW = INK_W * scale;
  const fontSize = 9;
  // 폭을 정수로 맞춘 뒤 워드마크를 오른쪽 여백 기준으로 되잡는다. 그래야 반올림
  // 오차가 좌우 여백이 아니라 가운데 간격으로 흡수된다.
  const w = Math.round(pad + inkW + gap * 2 + WORDMARK_LENGTH[fontSize] + pad);
  const wordX = round(w - pad - WORDMARK_LENGTH[fontSize]);
  const dividerX = round(wordX - gap);

  return `${svgOpen(w, h, title, input)}
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="6" fill="${p.bg}" stroke="${p.border}"/>
  ${emblem(input, p, pad, (h - inkH) / 2, scale)}
  <line x1="${dividerX}" y1="9" x2="${dividerX}" y2="25" stroke="${p.hairline}"/>
  ${wordmark(wordX, 20.4, fontSize, p.word)}
</svg>`;
}

/** 엠블럼 단독 — 아이콘 자리밖에 없는 푸터용. 잉크에 딱 맞춰 자른다. */
function renderCompact(input: BadgeInput, p: Palette, title: string): string {
  const inkH = 30;
  const scale = inkH / INK_H;
  const w = Math.round(INK_W * scale);
  const h = Math.round(inkH);
  return `${svgOpen(w, h, title, input)}
  ${emblem(input, p, (w - INK_W * scale) / 2, 0, scale)}
</svg>`;
}

/** 씰 — 엠블럼을 키우고 아래에 워드마크. */
function renderSeal(input: BadgeInput, p: Palette, title: string): string {
  const size = 96;
  const inkH = 54;
  const scale = inkH / INK_H;
  const inkW = INK_W * scale;
  const fontSize = 8;
  const inkTop = 11;

  return `${svgOpen(size, size, title, input)}
  ${emblem(input, p, (size - inkW) / 2, inkTop, scale)}
  <line x1="${size / 2 - 16}" y1="${inkTop + inkH + 9}" x2="${size / 2 + 16}" y2="${inkTop + inkH + 9}" stroke="${p.hairline}"/>
  ${wordmark((size - WORDMARK_LENGTH[fontSize]) / 2, inkTop + inkH + 21, fontSize, p.word)}
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
