import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ADMIN_COOKIE_NAME, isValidSessionCookieValue } from '../../lib/auth';
import { getFavicons } from '../../lib/favicon';

/*
  파비콘 프록시. 관리자 카드와 등록 폼의 로고 후보 목록이 쓴다.

  API 키를 브라우저에 내리지 않으려고 서버가 tool99 를 대신 부른다. 제공처 한도가 키 하나에
  분당 60회라 호출자를 둘로 나눈다.

    - 관리자: IP 제한 없음.
    - 방문자: 같은 출처의 브라우저 요청만 받고(Sec-Fetch-Site), IP 당 분당 6회·시간당 40회로
      제한한다. 캐시에서 나가는 응답은 세지 않는다.

  어느 쪽이든 우리 쪽 전체 호출이 분당 45회를 넘으면 막는다(lib/favicon.ts).
  방문자에게는 키가 없거나 틀렸다는 설정 정보를 알려주지 않고 일반 오류로 돌려준다.
*/
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

export const GET: APIRoute = async ({ cookies, url, request, clientAddress }) => {
  const isAdmin = await isValidSessionCookieValue(env.ADMIN_PASSWORD, cookies.get(ADMIN_COOKIE_NAME)?.value);

  if (!isAdmin && request.headers.get('Sec-Fetch-Site') !== 'same-origin') {
    return reply({ ok: false, reason: 'forbidden' }, 403);
  }

  let ip: string | null = null;
  try {
    ip = clientAddress;
  } catch {
    ip = null;
  }

  const target = url.searchParams.get('url')?.trim() ?? '';
  const result = await getFavicons(
    env,
    target,
    isAdmin ? { ip: 'admin' } : { ip, perIpPerMinute: 6, perIpPerHour: 40 }
  );

  if (!isAdmin && !result.ok && (result.reason === 'disabled' || result.reason === 'unauthorized')) {
    return reply({ ok: false, reason: 'error' });
  }
  return reply(result);
};
