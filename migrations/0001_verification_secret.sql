-- 소유권 인증 셀프 서비스 복구 (2026-08-30)
--
-- 인증 페이지를 공개 slug 가 아니라 추측 불가능한 시크릿으로 주소를 잡기 위한 컬럼과,
-- 확인 버튼이 대상 사이트를 반복 fetch 하지 못하게 막는 쿨다운 기준 컬럼.
--
-- 반드시 코드 배포 *전에* 적용할 것. 새 코드의 insertSiteSubmission 이
-- verification_secret 을 쓰므로, 컬럼 없이 배포하면 사이트 등록이 실패한다.
ALTER TABLE sites ADD COLUMN verification_secret TEXT;
ALTER TABLE sites ADD COLUMN last_verify_attempt_at TEXT;

-- 기존 사이트 백필. randomblob() 은 행마다 새로 평가되므로 한 문장으로 전부 서로 다른
-- 값이 들어간다(로컬 597행에서 중복 0건 확인). 유니크 인덱스는 값을 다 채운 뒤에 건다.
UPDATE sites SET verification_secret = lower(hex(randomblob(32))) WHERE verification_secret IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_verification_secret ON sites(verification_secret);
