DROP TABLE IF EXISTS site_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS subcategories;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE subcategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category_id, slug)
);

CREATE TABLE sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,

  -- 기본정보
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  cover_image_url TEXT,

  -- 분류
  category_id INTEGER NOT NULL REFERENCES categories(id),
  subcategory_id INTEGER REFERENCES subcategories(id),
  region TEXT,
  site_type TEXT,
  platform TEXT,

  -- 검색
  main_keywords TEXT,
  service_keywords TEXT,

  -- 운영
  operator_name TEXT,
  business_name TEXT,
  service_region TEXT,
  customer_center TEXT,
  contact_email TEXT,

  -- 외부 채널
  blog_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  other_sns_url TEXT,

  -- 검증
  http_status INTEGER,
  is_https INTEGER,
  ownership_verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  verification_method TEXT CHECK (verification_method IN ('meta_tag', 'dns_txt') OR verification_method IS NULL),
  third_party_submission INTEGER NOT NULL DEFAULT 0,
  verified_by_admin INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  verified_at TEXT,

  -- 운영 메타
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_email TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT
);

CREATE INDEX idx_sites_category_status ON sites(category_id, status);
CREATE INDEX idx_sites_subcategory_status ON sites(subcategory_id, status);
CREATE INDEX idx_sites_status_created ON sites(status, created_at);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE site_tags (
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (site_id, tag_id)
);

INSERT INTO categories (slug, name, description, sort_order) VALUES
  ('it-development', 'IT/개발', '개발 도구, 기술 블로그, 오픈소스 프로젝트', 1),
  ('shopping', '쇼핑/커머스', '온라인 쇼핑몰, 이커머스 플랫폼', 2),
  ('news-media', '뉴스/미디어', '뉴스, 언론, 미디어 사이트', 3),
  ('community', '커뮤니티', '커뮤니티, 포럼, 게시판', 4),
  ('education', '교육', '온라인 강의, 학습 플랫폼', 5),
  ('finance', '금융/재테크', '금융 서비스, 재테크, 투자 정보', 6),
  ('real-estate', '부동산', '부동산 정보, 매물 검색', 7),
  ('travel', '여행', '여행 정보, 숙박, 항공 예약', 8),
  ('health', '건강/의료', '건강 정보, 의료 서비스', 9),
  ('culture-entertainment', '문화/엔터테인먼트', '영화, 음악, 공연, 취미', 10),
  ('public-gov', '공공/정부', '공공기관, 정부 서비스', 11),
  ('career-job', '취업/구인구직', '채용, 이력서, 커리어 정보', 12),
  ('lifestyle', '라이프스타일', '생활 정보, 리빙, 뷰티', 13),
  ('etc', '기타', '기타 분류되지 않은 사이트', 14);

INSERT INTO subcategories (category_id, slug, name, sort_order) VALUES
  ((SELECT id FROM categories WHERE slug = 'it-development'), 'dev-tools', '개발 도구', 1),
  ((SELECT id FROM categories WHERE slug = 'it-development'), 'cloud-hosting', '클라우드/호스팅', 2),
  ((SELECT id FROM categories WHERE slug = 'it-development'), 'ai-data', 'AI/데이터', 3),
  ((SELECT id FROM categories WHERE slug = 'it-development'), 'security', '보안', 4),
  ((SELECT id FROM categories WHERE slug = 'it-development'), 'open-source', '오픈소스', 5),

  ((SELECT id FROM categories WHERE slug = 'shopping'), 'general-mall', '종합몰', 1),
  ((SELECT id FROM categories WHERE slug = 'shopping'), 'fashion-beauty', '패션/뷰티', 2),
  ((SELECT id FROM categories WHERE slug = 'shopping'), 'food', '식품', 3),
  ((SELECT id FROM categories WHERE slug = 'shopping'), 'refurb-used', '리퍼브/중고', 4),
  ((SELECT id FROM categories WHERE slug = 'shopping'), 'overseas-direct', '해외직구', 5),

  ((SELECT id FROM categories WHERE slug = 'news-media'), 'general-news', '종합뉴스', 1),
  ((SELECT id FROM categories WHERE slug = 'news-media'), 'it-tech-news', 'IT/테크뉴스', 2),
  ((SELECT id FROM categories WHERE slug = 'news-media'), 'economy', '경제', 3),
  ((SELECT id FROM categories WHERE slug = 'news-media'), 'entertainment-sports', '연예/스포츠', 4),
  ((SELECT id FROM categories WHERE slug = 'news-media'), 'local-news', '지역뉴스', 5),

  ((SELECT id FROM categories WHERE slug = 'community'), 'hobby', '취미', 1),
  ((SELECT id FROM categories WHERE slug = 'community'), 'parenting', '육아', 2),
  ((SELECT id FROM categories WHERE slug = 'community'), 'gaming', '게임', 3),
  ((SELECT id FROM categories WHERE slug = 'community'), 'school-alumni', '학교/동문', 4),
  ((SELECT id FROM categories WHERE slug = 'community'), 'local-community', '지역커뮤니티', 5),

  ((SELECT id FROM categories WHERE slug = 'education'), 'language', '어학', 1),
  ((SELECT id FROM categories WHERE slug = 'education'), 'it-coding', 'IT/코딩', 2),
  ((SELECT id FROM categories WHERE slug = 'education'), 'certification', '자격증', 3),
  ((SELECT id FROM categories WHERE slug = 'education'), 'admissions', '입시', 4),
  ((SELECT id FROM categories WHERE slug = 'education'), 'hobby-culture', '취미/교양', 5),

  ((SELECT id FROM categories WHERE slug = 'finance'), 'bank-card', '은행/카드', 1),
  ((SELECT id FROM categories WHERE slug = 'finance'), 'stock-invest', '증권/투자', 2),
  ((SELECT id FROM categories WHERE slug = 'finance'), 'insurance', '보험', 3),
  ((SELECT id FROM categories WHERE slug = 'finance'), 'loan-credit', '대출/신용', 4),
  ((SELECT id FROM categories WHERE slug = 'finance'), 'money-tips', '재테크정보', 5),

  ((SELECT id FROM categories WHERE slug = 'real-estate'), 'sale-lease', '매매/전세', 1),
  ((SELECT id FROM categories WHERE slug = 'real-estate'), 'new-development', '신축분양', 2),
  ((SELECT id FROM categories WHERE slug = 'real-estate'), 'auction', '경매', 3),
  ((SELECT id FROM categories WHERE slug = 'real-estate'), 'commercial', '상업용', 4),
  ((SELECT id FROM categories WHERE slug = 'real-estate'), 'real-estate-info', '부동산정보', 5),

  ((SELECT id FROM categories WHERE slug = 'travel'), 'flight-hotel', '항공/숙박예약', 1),
  ((SELECT id FROM categories WHERE slug = 'travel'), 'domestic', '국내여행', 2),
  ((SELECT id FROM categories WHERE slug = 'travel'), 'overseas', '해외여행', 3),
  ((SELECT id FROM categories WHERE slug = 'travel'), 'camping-activity', '캠핑/액티비티', 4),
  ((SELECT id FROM categories WHERE slug = 'travel'), 'travel-info', '여행정보', 5),

  ((SELECT id FROM categories WHERE slug = 'health'), 'hospital-clinic', '병원/의원', 1),
  ((SELECT id FROM categories WHERE slug = 'health'), 'health-info', '건강정보', 2),
  ((SELECT id FROM categories WHERE slug = 'health'), 'fitness', '피트니스', 3),
  ((SELECT id FROM categories WHERE slug = 'health'), 'mental-health', '정신건강', 4),
  ((SELECT id FROM categories WHERE slug = 'health'), 'alternative-medicine', '한방/대체의학', 5),

  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'movie-drama', '영화/드라마', 1),
  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'music', '음악', 2),
  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'performance-exhibit', '공연/전시', 3),
  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'webtoon-book', '웹툰/도서', 4),
  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'fandom', '취미/덕질', 5),

  ((SELECT id FROM categories WHERE slug = 'public-gov'), 'central-gov', '중앙정부', 1),
  ((SELECT id FROM categories WHERE slug = 'public-gov'), 'local-gov', '지자체', 2),
  ((SELECT id FROM categories WHERE slug = 'public-gov'), 'public-agency', '공공기관', 3),
  ((SELECT id FROM categories WHERE slug = 'public-gov'), 'civil-affairs', '민원/행정', 4),
  ((SELECT id FROM categories WHERE slug = 'public-gov'), 'open-data', '공공데이터', 5),

  ((SELECT id FROM categories WHERE slug = 'career-job'), 'job-listing', '채용정보', 1),
  ((SELECT id FROM categories WHERE slug = 'career-job'), 'resume-portfolio', '이력서/포트폴리오', 2),
  ((SELECT id FROM categories WHERE slug = 'career-job'), 'freelance', '프리랜서', 3),
  ((SELECT id FROM categories WHERE slug = 'career-job'), 'headhunting', '헤드헌팅', 4),
  ((SELECT id FROM categories WHERE slug = 'career-job'), 'career-info', '커리어정보', 5),

  ((SELECT id FROM categories WHERE slug = 'lifestyle'), 'interior-living', '인테리어/리빙', 1),
  ((SELECT id FROM categories WHERE slug = 'lifestyle'), 'beauty', '뷰티', 2),
  ((SELECT id FROM categories WHERE slug = 'lifestyle'), 'pet', '반려동물', 3),
  ((SELECT id FROM categories WHERE slug = 'lifestyle'), 'family', '육아/가족', 4),
  ((SELECT id FROM categories WHERE slug = 'lifestyle'), 'hobby-life', '취미생활', 5),

  ((SELECT id FROM categories WHERE slug = 'etc'), 'etc', '기타', 1);
