-- 관리자가 직접 올린 로고 이미지 (2026-10-04)
--
-- 일부 사이트는 이미지 핫링크를 막아 놓아서 logo_url 에 주소를 넣어도 우리 페이지에서
-- 깨진 이미지로 보인다. 그런 사이트의 로고는 파일을 받아 직접 보관한다.
--
-- 로고는 화면에서 40~56px 로만 쓰이는 작은 파일이라 R2 를 새로 붙이지 않고 D1 에
-- base64 텍스트로 둔다. BLOB 은 D1 바인딩이 ArrayBuffer/배열로 오가는 방식이 환경마다
-- 달라 텍스트가 더 안전하다. 업로드 시 sites.logo_url 은 /logo/{id}?v=... 로 바뀌므로
-- 카드·상세·검색 제안 등 기존 렌더링 코드는 그대로 동작한다.
CREATE TABLE IF NOT EXISTS site_logos (
  site_id INTEGER PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  data_base64 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
