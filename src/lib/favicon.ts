import { normalizeRequiredUrl } from './urls';

/*
  tool99 파비콘 API 조회.

  관리자 화면에서 로고 후보를 보여줄 때 쓴다. 브라우저가 API 를 직접 부르면 키가 페이지에
  실리므로 서버가 대신 부르고(/api/favicon), 화면은 그 결과만 쓴다.

  제공처 규칙을 그대로 따른다.
    - 키는 서버 환경변수(FAVICON_API_KEY)에만 둔다.
    - 같은 도메인은 최소 1일 캐시한다. (favicon_cache 테이블)
    - 429·503 을 받아도 재시도하지 않는다. 호출한 쪽에 실패로 돌려준다.
    - 내부망·사설 IP 주소는 조회하지 않는다.
  아이콘은 보조 요소라, 어떤 실패도 예외로 던지지 않고 사유만 돌려준다.
*/

const DEFAULT_BASE = 'https://tool99.net/api/v1/favicon';
const TIMEOUT_MS = 7000;
const MAX_STORED = 20;

/** 화면에 보여주는 최대 개수. */
export const MAX_ICONS = 5;

export interface FaviconIcon {
  url: string;
  mime: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  vector: boolean;
  sources: string[];
}

export type FaviconFailure =
  | 'invalid'
  | 'disabled'
  | 'unauthorized'
  | 'blocked'
  | 'rate_limited'
  | 'busy'
  | 'timeout'
  | 'error';

export type FaviconResult =
  | { ok: true; icons: FaviconIcon[]; cached: boolean }
  | { ok: false; reason: FaviconFailure };

interface FaviconEnv {
  DB: D1Database;
  FAVICON_API_KEY?: string;
  FAVICON_API_BASE?: string;
}

/** 공개 도메인만 조회한다. IP 주소와 내부망에서 쓰는 이름은 제공처에도 보내지 않는다. */
export function isQueryableHost(host: string): boolean {
  if (!host.includes('.')) return false;
  if (host.includes(':')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (/(^|\.)(localhost|local|internal|lan|home|corp|intranet)$/.test(host)) return false;
  return true;
}

/** 크기 순서를 정하는 값. SVG 는 어떤 크기로도 쓸 수 있으니 가장 크게, 크기를 모르면 가장 작게 둔다. */
function weight(icon: FaviconIcon): number {
  if (icon.vector) return Number.POSITIVE_INFINITY;
  if (icon.width && icon.height) return icon.width * icon.height;
  return -1;
}

/**
 * 후보가 많으면 큰 것부터 5개를 고르고, 보여줄 때는 작은 것부터 늘어놓는다.
 * 로고는 40~56px 로 쓰이지만 16px 파비콘을 늘리면 흐려져서, 작은 것만 남기지 않는다.
 */
export function selectIcons(icons: FaviconIcon[]): FaviconIcon[] {
  const seen = new Set<string>();
  const unique = icons.filter((icon) => (seen.has(icon.url) ? false : (seen.add(icon.url), true)));
  return unique
    .sort((a, b) => weight(b) - weight(a))
    .slice(0, MAX_ICONS)
    .sort((a, b) => weight(a) - weight(b));
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function normalizeIcon(raw: unknown): FaviconIcon | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const url = typeof item.url === 'string' ? item.url.trim() : '';
  // 이 주소가 그대로 로고 칸과 <img> 에 들어가므로 http(s) 만 받는다.
  if (!/^https?:\/\//i.test(url) || url.length > 2000) return null;
  return {
    url,
    mime: typeof item.mime === 'string' ? item.mime.slice(0, 60) : null,
    bytes: toNumber(item.bytes),
    width: toNumber(item.width),
    height: toNumber(item.height),
    vector: item.vector === true,
    sources: Array.isArray(item.sources) ? item.sources.filter((s): s is string => typeof s === 'string').slice(0, 5) : [],
  };
}

function parseIcons(body: unknown): FaviconIcon[] {
  if (!body || typeof body !== 'object') return [];
  const data = body as { best?: unknown; icons?: unknown };
  const raw = Array.isArray(data.icons) && data.icons.length > 0 ? data.icons : data.best ? [data.best] : [];
  return raw.map(normalizeIcon).filter((icon): icon is FaviconIcon => icon !== null).slice(0, MAX_STORED);
}

async function readCache(db: D1Database, host: string): Promise<FaviconIcon[] | null> {
  try {
    const row = await db
      .prepare(`SELECT payload FROM favicon_cache WHERE host = ? AND fetched_at >= datetime('now', '-1 day')`)
      .bind(host)
      .first<{ payload: string }>();
    if (!row) return null;
    const parsed = JSON.parse(row.payload) as { icons?: unknown[] };
    return (parsed.icons ?? []).map(normalizeIcon).filter((icon): icon is FaviconIcon => icon !== null);
  } catch {
    return null;
  }
}

async function writeCache(db: D1Database, host: string, icons: FaviconIcon[]): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO favicon_cache (host, payload, fetched_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(host) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`
      )
      .bind(host, JSON.stringify({ icons }))
      .run();
  } catch {
    // 캐시에 쓰지 못해도 조회 결과는 그대로 돌려준다.
  }
}

export async function getFavicons(env: FaviconEnv, target: string): Promise<FaviconResult> {
  const normalized = normalizeRequiredUrl(target);
  if (!normalized) return { ok: false, reason: 'invalid' };
  const host = normalized.hostname.toLowerCase();
  if (!isQueryableHost(host)) return { ok: false, reason: 'invalid' };

  const cached = await readCache(env.DB, host);
  if (cached) return { ok: true, icons: selectIcons(cached), cached: true };

  const key = env.FAVICON_API_KEY?.trim();
  if (!key) return { ok: false, reason: 'disabled' };

  const base = env.FAVICON_API_BASE?.trim() || DEFAULT_BASE;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${base}?url=${encodeURIComponent(normalized.origin + '/')}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'error' };
  } finally {
    clearTimeout(timer);
  }

  switch (response.status) {
    case 200: {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return { ok: false, reason: 'error' };
      }
      const icons = parseIcons(body);
      await writeCache(env.DB, host, icons);
      return { ok: true, icons: selectIcons(icons), cached: false };
    }
    case 404:
      // 아이콘이 없다는 확정 응답이라 하루 동안은 다시 묻지 않는다.
      await writeCache(env.DB, host, []);
      return { ok: true, icons: [], cached: false };
    case 401:
      return { ok: false, reason: 'unauthorized' };
    case 400:
    case 422:
      return { ok: false, reason: 'blocked' };
    case 429:
      return { ok: false, reason: 'rate_limited' };
    case 503:
      return { ok: false, reason: 'busy' };
    default:
      return { ok: false, reason: 'error' };
  }
}
