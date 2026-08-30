-- 캐스퍼차고 cover_image_url 제거 (2026-08-30)
--
-- 이 값을 넣은 게 실수였다. cspr.kr 의 OG 이미지를 넣으니
--   - 상세 페이지 상단에 정보가 아닌 홍보 배너가 붙고(그것도 글자가 잘린 채)
--   - siteda.kr 페이지를 공유했을 때 남의 사이트 브랜딩이 og:image 로 나간다
-- og:image 는 검색 순위와 무관하므로 얻는 것도 없다.
UPDATE sites SET cover_image_url = NULL, updated_at = datetime('now')
WHERE slug = '캐스퍼차고-pznxor';
