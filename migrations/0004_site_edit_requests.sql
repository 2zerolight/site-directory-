-- 사이트 수정 신청 (2026-10-24)
--
-- 등록된 사이트의 운영자가 정보를 고치고 싶을 때 신청을 받는다. 신청은 바로 반영되지 않고
-- 이 테이블에 쌓이며, 관리자가 대시보드(/dashboard/edits)나 텔레그램 버튼으로 반영한다.
--
-- changes_json 에는 현재 값과 달라진 항목만 {"tagline":"..."} 형태로 담는다. 값이 빈 문자열이면
-- "비워 달라"는 뜻이다. email_verified 는 신청 시 입력한 이메일이 사이트에 등록된 이메일과
-- 일치했는지이고, 일치해도 관리자가 diff 를 보고 판단한다는 전제는 그대로다.
CREATE TABLE IF NOT EXISTS site_edit_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  changes_json TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_site_edit_requests_status ON site_edit_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_site_edit_requests_site ON site_edit_requests(site_id, status);
