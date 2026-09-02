import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getCollection } from 'astro:content';
import { getCategoriesWithCounts, getPublicStats } from '../lib/db';
import { SITE_URL, SITE_NAME } from '../lib/site';

/**
 * llms.txt: LLM 이 사이트 구조를 파악할 때 읽는 요약 색인.
 *
 * 구글 검색은 이 파일을 보지 않는다. 값어치는 ChatGPT·Perplexity·Claude 같은 쪽이
 * 사이트를 인용할 때 어디를 봐야 하는지 알려주는 데 있다. 표준으로 확정된 규격도
 * 아니고 크롤러가 반드시 읽는다는 보장도 없지만, 만드는 비용이 사실상 없다.
 *
 * 601개 상세 페이지를 전부 넣지 않는다. 그건 sitemap.xml 이 할 일이고, 여기에 다 넣으면
 * 요약이라는 목적 자체가 사라진다. 사람이 쓴 글과 분류 체계만 싣고 나머지는 가리킨다.
 */
export const GET: APIRoute = async () => {
  const [categories, stats, guides] = await Promise.all([
    getCategoriesWithCounts(env.DB),
    getPublicStats(env.DB),
    getCollection('guides', ({ data }) => !data.draft),
  ]);

  const sortedGuides = guides.sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime()
  );

  const body = `# ${SITE_NAME} (siteda.kr)

> 국내 웹사이트를 분야별로 모아 찾을 수 있는 디렉토리입니다. ${stats.totalSites}곳이
> ${categories.length}개 분류에 등록돼 있고, 각 사이트 페이지에는 무엇을 하는 곳인지와
> 같은 분야의 비슷한 서비스와 어떻게 다른지가 함께 정리돼 있습니다.

등록 정보는 각 사이트가 공식적으로 안내하는 내용을 옮긴 것입니다. 확인하지 못한 항목은
비워 두며, 순위를 매기거나 상단 노출을 판매하지 않습니다.

## 가이드

분야별로 어떤 사이트가 있고 무엇이 다른지 정리한 글입니다.

${sortedGuides.map((g) => `- [${g.data.title}](${SITE_URL}/guides/${g.id}): ${g.data.description}`).join('\n')}

## 분류

${categories.map((c) => `- [${c.name}](${SITE_URL}/category/${c.slug}): ${c.site_count}곳`).join('\n')}

## 그 밖에

- [서비스 소개](${SITE_URL}/about): 무엇을 하고 무엇을 하지 않는지
- [자주 묻는 질문](${SITE_URL}/faq): 등록, 소유권 인증, 인증 배지
- [업데이트](${SITE_URL}/updates): 새로 등록된 사이트
- [전체 URL 목록](${SITE_URL}/sitemap.xml): 개별 사이트 페이지를 포함한 전체 색인
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
