-- 캐스퍼차고(cspr.kr) 등록 정보 보강 + 중복 레코드 정리 (2026-08-30)
--
-- 문제:
--   1) service_keywords 가 비어 있어 상세 페이지의 "비슷한 사이트" 비교표가
--      아예 렌더링되지 않는다(자기 행이 필터에서 떨어진다). 같은 소분류
--      '자동차 정보'에 5곳이 더 있어 값만 채우면 바로 표가 나온다.
--   2) region/service_region/cover_image_url 이 비어 정보 행이 0줄이고
--      og:image 가 사이트 공용 기본 이미지로 나간다.
--   3) 태그 6개가 '거절된' 중복 레코드에 붙어 있어, 승인 사이트가 0개인
--      태그 페이지가 6개 생겼다(사이트맵에는 없지만 주소로는 열렸다).
--
-- 값은 전부 cspr.kr 에서 확인한 사실이다. 확인 못 한 항목(operator_name)은
-- 비워 둔다 — 추측해서 채우면 디렉토리의 값어치가 사라진다.

-- (1) 승인 레코드 보강
UPDATE sites SET
  service_keywords = '출고 대기 기간 조회, 정비·소모품 가이드, 출고 전 체크리스트',
  site_type        = '블로그',
  region           = '전국',
  service_region   = '전국',
  cover_image_url  = 'https://cspr.kr/og/default.png',
  updated_at       = datetime('now')
WHERE slug = '캐스퍼차고-pznxor';

-- (2) 수평 링크용 태그 연결.
--     '차량 정보 제공' 은 현대자동차·기아·제네시스·테슬라가 이미 쓰는 태그라
--     붙이는 순간 상세↔상세 링크가 생긴다. '캐스퍼' 는 브랜드 축.
INSERT OR IGNORE INTO tags (slug, name) VALUES ('캐스퍼', '캐스퍼');
INSERT OR IGNORE INTO site_tags (site_id, tag_id)
SELECT (SELECT id FROM sites WHERE slug = '캐스퍼차고-pznxor'), id
FROM tags WHERE name IN ('차량 정보 제공', '캐스퍼');

-- (3) 같은 URL 로 두 번 등록된 거절 레코드 삭제.
--     site_tags 는 ON DELETE CASCADE 로 함께 지워진다.
DELETE FROM sites WHERE slug = '캐스퍼차고-1z2c0p' AND status = 'rejected';

-- (4) 그러고 나서 어디에도 안 붙은 태그 정리.
--     main_keywords 를 그대로 태그로 만든 것들이라(현대캐스퍼·더뉴캐스퍼 등)
--     되살려도 1개짜리 thin 태그 페이지만 늘어난다.
DELETE FROM tags WHERE NOT EXISTS (SELECT 1 FROM site_tags st WHERE st.tag_id = tags.id);
