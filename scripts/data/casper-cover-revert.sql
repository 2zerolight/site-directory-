-- 캐스퍼차고 cover_image_url 되돌리기 (2026-08-30)
--
-- 넣지 말았어야 할 값이다. cspr.kr 의 OG 이미지를 넣으면
--   - siteda.kr 페이지를 공유했을 때 남의 사이트 브랜딩이 뜨고
--   - 상세 페이지 상단에 정보가 아닌 홍보 배너가 붙는다
-- og:image 는 검색 순위와 무관하므로 얻는 것도 없다.
-- 사이트가 직접 만든 '대표 이미지'가 생기면 그때 넣는다.
UPDATE sites SET cover_image_url = NULL, updated_at = datetime('now')
WHERE slug = '캐스퍼차고-pznxor';
