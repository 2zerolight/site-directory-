-- marketing-ads 카테고리 정리 (2026-09-01)
--
-- 등록할 때 사이트의 <title> 을 그대로 가져와 이름과 slug 에 마케팅 문구가 박혔다.
--   "리뷰노트 – 대한민국 체험단 수 1위, 신뢰받는 리뷰"
--   /site/포포몬-no-1-무료-인플루언서-체험단-협찬매칭-bbx5zo
-- 상세 페이지의 <h1>·<title> 이 광고 문구가 되고, 검증되지 않은 "1위"·"NO.1" 주장을
-- 디렉토리가 그대로 싣게 된다. 브랜드명만 남긴다.
--
-- service_keywords 는 12곳 중 11곳이 비어 있어 비교표가 아예 안 나왔다. 값은 각 사이트가
-- 자기 메타 설명에 밝힌 내용만 옮겼고, 캠페인 조건·선정 방식·수수료처럼 확인할 수 없는
-- 것은 쓰지 않았다.
--
-- slug 를 바꾸면 예전 주소가 404 가 되므로 site/[slug].astro 의 OLD_SITE_SLUG_REDIRECTS
-- 에 301 을 걸어두었다. 카테고리 slug 를 바꿀 때 쓰던 방식과 같다.

-- 이름과 slug 에서 마케팅 문구 제거
UPDATE sites SET name = '리뷰노트',     slug = '리뷰노트-zyuinb'    WHERE id = 608;
UPDATE sites SET name = '리뷰플레이스',   slug = '리뷰플레이스-yezuq1'  WHERE id = 611;
UPDATE sites SET name = '포포몬',       slug = '포포몬-bbx5zo'     WHERE id = 613;
UPDATE sites SET name = '아싸뷰',       slug = '아싸뷰-op66vv'     WHERE id = 614;
UPDATE sites SET name = '링블',        slug = '링블-n4irg0'      WHERE id = 615;

-- 하는 일 채우기 (비교표가 열린다)
UPDATE sites SET service_keywords = '맛집 체험단 모집, 인스타그램 캠페인 모집'        WHERE id = 605;
UPDATE sites SET service_keywords = '체험단 모집, 인플루언서 마케팅 컨설팅'          WHERE id = 606;
UPDATE sites SET service_keywords = '크리에이터 중개, 협찬 매칭'                 WHERE id = 607;
UPDATE sites SET service_keywords = '체험단 모집, 인플루언서 매칭'                WHERE id = 608;
UPDATE sites SET service_keywords = '체험단 캠페인 모집, 결과보고서 제공'           WHERE id = 609;
UPDATE sites SET service_keywords = '체험단 캠페인 모집, 인플루언서 마케팅'          WHERE id = 610;
UPDATE sites SET service_keywords = '제품·맛집·서비스 체험단 모집'                WHERE id = 611;
UPDATE sites SET service_keywords = '체험단 캠페인 모아보기, 캠페인 검색'           WHERE id = 612;
UPDATE sites SET service_keywords = '협찬 매칭, 인플루언서 지수 분석, 1:1 협찬 제안'  WHERE id = 613;
UPDATE sites SET service_keywords = '체험단 매칭, 인플루언서 리뷰 마케팅'           WHERE id = 614;
UPDATE sites SET service_keywords = '체험단 모집, 블로그·인스타그램 캠페인'          WHERE id = 615;

-- 서비스 지역이 비어 정보 행이 한 줄 모자랐다. region 이 전부 '전국'이므로 맞춰 채운다.
UPDATE sites SET service_region = '전국'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'marketing-ads')
  AND status = 'approved' AND COALESCE(service_region, '') = '';

-- 앤블로그만 유형이 비어 있었다. 체험단 플랫폼이 아니라 블로거용 도구 모음이다.
UPDATE sites SET site_type = '기타' WHERE id = 604 AND site_type IS NULL;

UPDATE sites SET updated_at = datetime('now')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'marketing-ads');
