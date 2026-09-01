import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSiteBySlug, incrementViewCount } from '../../lib/db';

/**
 * 상세 페이지 조회수를 브라우저에서 올린다.
 *
 * 미들웨어가 /site/ 를 엣지에서 600초 캐시하기 때문에, 서버 렌더링 중에 카운트를
 * 올리면 캐시 히트인 요청은 워커에 닿지도 않아 실제보다 크게 낮게 집계된다.
 * 캐시는 크롤 예산에 큰 이득이라 포기할 수 없으므로 집계를 캐시 밖으로 뺐다.
 *
 * 부수 효과로 집계가 더 정확해진다. 크롤러는 JS를 실행하지 않으므로 봇 트래픽이
 * 조회수를 부풀리지 않고, 사람 방문만 남는다.
 */
export const POST: APIRoute = async ({ request }) => {
  const fail = (status: number) =>
    new Response(JSON.stringify({ ok: false }), { status, headers: { 'Content-Type': 'application/json' } });

  let slug: string;
  try {
    const body = (await request.json()) as { slug?: string };
    slug = String(body.slug ?? '').trim();
  } catch {
    return fail(400);
  }

  if (!slug) return fail(400);

  // 임의의 id를 받아 아무 행이나 올리지 않도록 slug로 조회해 승인 여부까지 확인한다.
  const site = await getSiteBySlug(env.DB, slug);
  if (!site || site.status !== 'approved') return fail(404);

  await incrementViewCount(env.DB, site.id);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
