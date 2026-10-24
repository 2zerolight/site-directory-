-- 파비콘 API 조회 결과 캐시 (2026-10-26)
--
-- 관리자가 로고를 고를 때 tool99 파비콘 API 를 부른다. 제공처 규칙이 "도메인당 최소 1일 캐시"라
-- 같은 도메인을 다시 열어도 API 를 부르지 않도록 결과를 D1 에 둔다. Cache API 는 콜로 단위이고
-- 언제 밀려날지 몰라 "최소 1일"을 보장하지 못해서 테이블로 했다.
--
-- payload 는 {"icons":[...]} 이고, 아이콘이 없다는 응답(404)도 빈 배열로 저장한다. 429·503·시간
-- 초과처럼 일시적인 실패는 저장하지 않는다.
CREATE TABLE IF NOT EXISTS favicon_cache (
  host TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
