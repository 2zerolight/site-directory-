import { defineMiddleware } from 'astro:middleware';
import { ADMIN_COOKIE_NAME } from './lib/auth';

/**
 * 공개 목록/상세 페이지에만 CDN 캐시 헤더를 붙인다.
 *
 * SSR이라 모든 요청이 D1을 여러 번 조회하고 TTFB가 0.7초쯤 나오는데,
 * 크롤러가 수백 페이지를 훑으면 그대로 크롤 예산 낭비가 된다.
 * `s-maxage`로 Cloudflare 엣지에만 캐시시키고 브라우저는 항상 재검증하게 둔다.
 *
 * 캐시하면 안 되는 것들은 전부 제외한다. 관리자 세션이 있는 요청(로그인 상태에서는
 * 같은 URL도 다른 내용을 렌더링한다), 대시보드, 개인화/상태 변경 경로.
 */
const CACHEABLE_PREFIXES = ['/category/', '/site/', '/tag/'];
const CACHEABLE_EXACT = ['/', '/faq', '/updates', '/sitemap.xml', '/robots.txt'];

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  // HEAD는 본문 없는 GET이므로 동일하게 캐시 가능하다(크롤러가 HEAD를 쓰기도 한다).
  const method = context.request.method;
  if (method !== 'GET' && method !== 'HEAD') return response;
  // 로그인 상태에서는 관리자 전용 내용이 섞이므로 절대 캐시하지 않는다.
  if (context.cookies.get(ADMIN_COOKIE_NAME)?.value) return response;
  if (response.status !== 200) return response;
  if (response.headers.has('Cache-Control')) return response;

  const path = context.url.pathname;
  const cacheable =
    CACHEABLE_EXACT.includes(path) || CACHEABLE_PREFIXES.some((p) => path.startsWith(p));
  if (!cacheable) return response;

  // 렌더링 결과 Response의 헤더는 불변일 수 있어 .set()이 무시된다.
  // 헤더를 복사해 새 Response로 만들어 반환한다.
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=0, s-maxage=600');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
