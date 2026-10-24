import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ADMIN_COOKIE_NAME, isValidSessionCookieValue } from '../../lib/auth';
import { getFavicons } from '../../lib/favicon';

/*
  파비콘 프록시. 관리자 화면에서 로고 후보를 불러올 때만 쓴다.

  API 키를 브라우저에 내리지 않으려고 서버가 tool99 를 대신 부른다. 호출 한도가 키 하나에
  분당 60회라, 로그인하지 않은 사람이 마음대로 부르지 못하게 관리자에게만 연다.
*/
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

export const GET: APIRoute = async ({ cookies, url }) => {
  if (!(await isValidSessionCookieValue(env.ADMIN_PASSWORD, cookies.get(ADMIN_COOKIE_NAME)?.value))) {
    return new Response(JSON.stringify({ ok: false, reason: 'unauthorized_admin' }), { status: 401, headers: JSON_HEADERS });
  }

  const target = url.searchParams.get('url')?.trim() ?? '';
  const result = await getFavicons(env, target);
  return new Response(JSON.stringify(result), { headers: JSON_HEADERS });
};
