-- verification_token 백필 (2026-08-30)
--
-- 등록 폼이 생기기 전에 시드된 사이트들은 verification_token 이 NULL 이다(프로덕션
-- 603곳 중 580곳). 인증 페이지는 이 값을 화면에 찍어 상대 도메인에 올리게 하는데
-- 비어 있으면 content="" 인 메타태그를 안내하게 되고, verifyOwnership 은 토큰이
-- 없으면 바로 실패를 돌려주므로 그 사이트들은 영원히 인증할 수 없다.
--
-- 형식은 generateVerificationToken() 과 동일하게 sitedir- + 16바이트 hex.
-- randomblob() 은 행마다 새로 평가되므로 한 문장으로 전부 다른 값이 들어간다.
UPDATE sites
SET verification_token = 'sitedir-' || lower(hex(randomblob(16)))
WHERE verification_token IS NULL OR verification_token = '';
