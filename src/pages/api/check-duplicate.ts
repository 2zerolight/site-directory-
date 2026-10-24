import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findSiteByUrlHost, findLiveSiteByHost } from '../../lib/db';

export const GET: APIRoute = async ({ url: requestUrl }) => {
  const target = requestUrl.searchParams.get('url')?.trim() ?? '';

  let hostname: string;
  try {
    hostname = new URL(target).hostname;
  } catch {
    return new Response(JSON.stringify({ exists: false }), { headers: { 'Content-Type': 'application/json' } });
  }

  const headers = { 'Content-Type': 'application/json' };

  // 노출 중이거나 대기 중인 사이트가 먼저다. 호스트가 정확히 같은 것만 본다.
  const live = await findLiveSiteByHost(env.DB, hostname);
  if (live?.status === 'approved') {
    return new Response(JSON.stringify({ exists: true, status: 'approved', name: live.name, slug: live.slug }), { headers });
  }
  // 대기 중인 사이트는 상세 페이지가 공개되지 않으므로 이름과 주소를 알려주지 않는다.
  if (live) {
    return new Response(JSON.stringify({ exists: true, status: 'pending' }), { headers });
  }

  const earlier = await findSiteByUrlHost(env.DB, hostname);
  if (earlier?.status === 'rejected') {
    return new Response(JSON.stringify({ exists: true, status: 'rejected' }), { headers });
  }

  return new Response(JSON.stringify({ exists: false }), { headers });
};
