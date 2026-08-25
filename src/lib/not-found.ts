import type { AstroGlobal } from 'astro';

/**
 * 존재하지 않는 리소스에 대해 404 페이지를 그대로 렌더링하되 HTTP 상태코드도 404로 반환한다.
 *
 * `Astro.redirect('/404')` 를 쓰면 302 리디렉션이 나가고, 구글은 이걸
 * "페이지에 리디렉션이 있음"으로 분류한다. 없는 페이지는 곧바로 404를 반환해야
 * 색인에서 깔끔하게 제외된다.
 */
export async function renderNotFound(astro: AstroGlobal): Promise<Response> {
  const res = await astro.rewrite('/404');
  return new Response(res.body, { status: 404, headers: res.headers });
}
