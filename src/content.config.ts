import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 사이트다가 직접 쓰는 글.
 *
 * 781개 URL 이 전부 DB 를 렌더링한 페이지라 "우리가 쓴 문장"이 카테고리 해설 21개뿐이었다.
 * 디렉토리 상세는 원본 사이트와의 검색 경쟁에서 이기기 어렵고 목록 페이지는 노릴 수 있는
 * 검색어가 좁은데, 그 사이를 메우는 게 이 글들이다 — 검색 수요가 있는 질문에 답하면서
 * 자기 목록으로 연결한다.
 *
 * 글에 등장하는 서비스 정보는 전부 디렉토리 DB 에 저장된 값이어야 한다. 확인하지 않은
 * 절차·요금·기한을 지어내면 그 순간 원본보다 나쁜 페이지가 된다.
 */
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    /** meta description 겸 목록의 요약. 한국어 스니펫이 잘리지 않게 짧게 쓴다. */
    description: z.string().max(120),
    /** 목록 카드와 본문 첫머리에 쓰는 한 줄. description 과 달리 길어도 된다. */
    lead: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** 이 글이 연결되는 카테고리 slug. 양방향 링크를 만드는 데 쓴다. */
    category: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guides };
