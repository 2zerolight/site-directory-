import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSiteBySlug } from '../../lib/db';
import { badgeAltText, parseBadgeStyle, parseBadgeTheme, renderBadgeSvg } from '../../lib/badge';

export const GET: APIRoute = async ({ params, url }) => {
  const site = params.slug ? await getSiteBySlug(env.DB, params.slug) : null;

  // 배지에는 VERIFIED 가 박혀 있다. 잎을 선으로 바꾸고 체크만 빼서 낮춰 보여주면
  // 방문자는 여전히 "VERIFIED"만 읽으므로, 아무나 URL을 붙여 인증 배지를 얻는
  // 구멍이 된다. 인증되지 않은 사이트에는 아무것도 내주지 않는다.
  if (!site || site.status !== 'approved' || site.ownership_verified !== 1) {
    return new Response('이 사이트는 사이트다 소유권 인증이 되어 있지 않아 배지를 제공하지 않습니다.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  }

  const svg = renderBadgeSvg(
    {
      style: parseBadgeStyle(url.searchParams.get('style')),
      theme: parseBadgeTheme(url.searchParams.get('theme')),
    },
    badgeAltText(site.name)
  );

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Robots-Tag': 'noindex',
    },
  });
};
