export const SITE_TYPES = [
  '쇼핑몰',
  '블로그',
  '커뮤니티',
  '기업/브랜드',
  '포트폴리오',
  '뉴스/미디어',
  '공공기관',
  '교육/강의',
  '예약/플랫폼',
  '인플루언서',
  '기타',
] as const;

export const REGIONS = [
  '전국',
  '서울',
  '인천/경기',
  '강원',
  '대전/충청',
  '광주/전라',
  '대구/경북',
  '부산/울산/경남',
  '제주',
  '해외',
] as const;

// Primary SNS platform for a listing (mainly used by the SNS category, but
// kept generic so any category can use it if useful later).
export const PLATFORMS = [
  '유튜브',
  '인스타그램',
  '네이버블로그',
  '스레드',
  '틱톡',
  '페이스북',
  '트위터',
  '기타',
] as const;

export const VERIFICATION_META_NAME = 'site-directory-verification';
export const VERIFICATION_TXT_SUBDOMAIN = '_sitedir-verify';
