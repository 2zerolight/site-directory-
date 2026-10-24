-- 파비콘 API 호출 기록 (2026-10-24)
--
-- 등록 폼에서도 파비콘을 고를 수 있게 되면서 로그인하지 않은 방문자가 우리 서버를 통해 제공처 API
-- 를 부를 수 있게 됐다. 제공처 한도는 키 하나에 분당 60회라, 한 사람이 쓸어 가면 관리자 화면까지
-- 막힌다. 제공처로 실제 나간 호출만 여기에 한 줄씩 남기고, IP 별·전체 호출 수를 세는 데 쓴다.
-- 캐시에서 나간 응답은 기록하지 않는다. 한 시간이 지난 기록은 호출할 때마다 지운다.
CREATE TABLE IF NOT EXISTS favicon_lookups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_favicon_lookups_created ON favicon_lookups(created_at);
CREATE INDEX IF NOT EXISTS idx_favicon_lookups_ip ON favicon_lookups(ip, created_at);
