-- <title> 이 그대로 이름이 된 나머지 건 정리 (2026-09-01)
--
-- marketing-ads 12곳을 고친 뒤 전수 점검해 3건이 더 나왔다. 등록 폼이 og:site_name 이
-- 없을 때 <title> 을 그대로 이름으로 쓰기 때문인데, 그 경로는 lib/seo.ts 의
-- cleanSiteName 으로 막았다. 이건 이미 들어와 있는 데이터를 고치는 것이다.
--
-- 카카오 공유 디버거(id 560)는 이름이 "카카오톡 URL 메타정보 관리"인데, 홍보 문구가
-- 아니라 기능 설명이다. 그 도구의 정식 명칭을 확인할 수 없어 손대지 않는다.
-- 세븐틴(SEVENTEEN)(id 201)은 실제 이름이므로 그대로 둔다.

UPDATE sites SET name = '아이티이지',  slug = '아이티이지-yystwm'  WHERE id = 557;
UPDATE sites SET name = '제이알미디어', slug = '제이알미디어-fsmhre' WHERE id = 558;
UPDATE sites SET name = 'ww2.kr',    slug = 'ww2-kr-etvby4'   WHERE id = 559;

UPDATE sites SET updated_at = datetime('now') WHERE id IN (557, 558, 559);
