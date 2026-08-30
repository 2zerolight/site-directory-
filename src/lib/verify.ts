import { VERIFICATION_META_NAME, VERIFICATION_TXT_SUBDOMAIN } from './constants';

function randomHex(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 상대 도메인의 메타태그·DNS TXT 에 올리는 값. 남이 알아도 위험하지 않다 — 통과하려면 그쪽 도메인에 올려야 한다. */
export function generateVerificationToken(): string {
  return `sitedir-${randomHex(16)}`;
}

/**
 * 인증 페이지 주소를 잡는 열쇠. 이쪽은 진짜 비밀이다.
 *
 * 예전 구현은 /submit/verify/{slug} 였는데 slug 는 sitemap 에 600개가 실린 공개
 * 정보라, 주소만 조합하면 누구나 남의 인증 페이지를 열고 서버에 제3자 사이트를
 * fetch 시킬 수 있었다. 32바이트면 열거가 불가능하다.
 */
export function generateVerificationSecret(): string {
  return randomHex(32);
}

/** 확인 버튼 쿨다운(초). 대상 사이트를 fetch 하는 동작이라 연타를 막아야 한다. */
export const VERIFY_COOLDOWN_SECONDS = 30;

/** 마지막 시도로부터 쿨다운이 남았으면 남은 초를 돌려준다. 없으면 0. */
export function remainingCooldown(lastAttemptAt: string | null): number {
  if (!lastAttemptAt) return 0;
  const last = Date.parse(`${lastAttemptAt.replace(' ', 'T')}Z`);
  if (Number.isNaN(last)) return 0;
  const elapsed = (Date.now() - last) / 1000;
  return elapsed >= VERIFY_COOLDOWN_SECONDS ? 0 : Math.ceil(VERIFY_COOLDOWN_SECONDS - elapsed);
}

async function checkMetaTag(url: string, token: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeoutId);
    const html = await response.text();

    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern1 = new RegExp(`name=["']${VERIFICATION_META_NAME}["']\\s+content=["']${escapedToken}["']`, 'i');
    const pattern2 = new RegExp(`content=["']${escapedToken}["']\\s+name=["']${VERIFICATION_META_NAME}["']`, 'i');
    return pattern1.test(html) || pattern2.test(html);
  } catch {
    return false;
  }
}

async function checkDnsTxt(url: string, token: string): Promise<boolean> {
  try {
    const hostname = new URL(url).hostname;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${VERIFICATION_TXT_SUBDOMAIN}.${hostname}&type=TXT`,
      { headers: { Accept: 'application/dns-json' }, signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const data = await response.json<{ Answer?: { data: string }[] }>();
    return data.Answer?.some((a) => a.data.replace(/"/g, '') === token) ?? false;
  } catch {
    return false;
  }
}

export async function verifyOwnership(
  db: D1Database,
  site: { id: number; url: string; verification_token: string | null }
): Promise<{ ok: boolean; method: 'meta_tag' | 'dns_txt' | null }> {
  if (!site.verification_token) return { ok: false, method: null };

  if (await checkMetaTag(site.url, site.verification_token)) {
    await markVerified(db, site.id, 'meta_tag');
    return { ok: true, method: 'meta_tag' };
  }

  if (await checkDnsTxt(site.url, site.verification_token)) {
    await markVerified(db, site.id, 'dns_txt');
    return { ok: true, method: 'dns_txt' };
  }

  return { ok: false, method: null };
}

async function markVerified(db: D1Database, id: number, method: 'meta_tag' | 'dns_txt'): Promise<void> {
  await db
    .prepare(
      `UPDATE sites SET ownership_verified = 1, verification_method = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    )
    .bind(method, id)
    .run();
}
