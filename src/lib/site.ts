export const SITE_NAME = '사이트다';
export const SITE_DESCRIPTION = '분야별로 국내 웹사이트를 검색하고 발견하는 디렉토리 플랫폼';
export const SITE_URL = 'https://siteda.kr';

/**
 * Organization JSON-LD 의 sameAs 에 들어가는 공식 채널 주소.
 *
 * "사이트다"라는 이름은 siteda.co.kr 이 이미 쓰고 있어서 브랜드 검색어가 겹친다.
 * sameAs 는 구글에 "이 개체는 저 개체와 다르다"고 알려주는 가장 직접적인 신호이므로,
 * 운영 SNS/블로그가 생기는 대로 여기에 넣어야 한다. 비어 있으면 sameAs 키 자체를
 * 내보내지 않는다(빈 배열을 내보내면 신호가 아니라 잡음이다).
 */
export const SITE_SAME_AS: string[] = [];

/** 문의·삭제 요청·소유권 인증 요청·개인정보 관련 연락을 받는 공개 주소. */
export const CONTACT_EMAIL = 'contact@siteda.kr';

/**
 * 개인정보처리방침·이용약관의 "시행일". 내용을 실질적으로 고칠 때 같이 올린다.
 * (문서를 고쳐놓고 날짜를 안 올리면 이용자가 변경 사실을 알 방법이 없다)
 */
export const POLICY_EFFECTIVE_DATE = '2026년 8월 27일';

/** Google Analytics 4 측정 ID. 동의 전에는 로드되지 않는다 — Layout.astro 참고. */
export const GA_MEASUREMENT_ID = 'G-2G6NNJJCFZ';

/** 동의 여부를 저장하는 localStorage 키. 값은 'granted' | 'denied'. */
export const CONSENT_STORAGE_KEY = 'siteda_cookie_consent';

/** Google AdSense 게시자 ID. ads.txt 와 값이 어긋나면 광고가 나가지 않는다. */
export const ADSENSE_CLIENT_ID = 'ca-pub-3618308526218183';
