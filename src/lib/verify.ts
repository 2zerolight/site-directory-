import { VERIFICATION_META_NAME, VERIFICATION_TXT_SUBDOMAIN } from './constants';

export function generateVerificationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sitedir-${hex}`;
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
