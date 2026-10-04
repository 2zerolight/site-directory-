import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSiteLogo } from '../../lib/db';
import { fromBase64 } from '../../lib/logo-upload';

/*
  관리자가 올린 로고 이미지. sites.logo_url 이 /logo/{id}?v=... 를 가리킬 때 여기로 온다.

  ?v= 는 올릴 때마다 바뀌는 버전 값이라 브라우저에는 1년 캐시를 줘도 된다. 이 경로는
  미들웨어의 엣지 캐시 대상이 아니므로 Cache-Control 을 여기서 직접 붙인다.

  우리 도메인에서 사용자가 올린 파일을 내보내는 곳이라 방어를 겹친다. nosniff 로 MIME
  추측을 막고, SVG 는 직접 열어도 스크립트가 돌지 않게 CSP 로 샌드박스한다.
*/
export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 });

  const logo = await getSiteLogo(env.DB, id);
  if (!logo) return new Response('Not found', { status: 404 });

  const headers: Record<string, string> = {
    'Content-Type': logo.content_type,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };
  if (logo.content_type === 'image/svg+xml') {
    headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }

  return new Response(fromBase64(logo.data_base64), { headers });
};
