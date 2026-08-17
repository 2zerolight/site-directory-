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
  ('portal-search', '포털/검색', '검색엔진, 포털, 지도, 메일', 1),
  ('it-dev', 'IT/개발', '개발도구, 호스팅, 클라우드, 오픈소스', 2),
  ('shopping-price', '쇼핑/가격비교', '온라인 쇼핑몰, 가격비교, 상품검색', 3),
  ('finance', '금융/재테크', '은행, 카드, 증권, 보험, 투자', 4),
  ('life-convenience', '생활/편의', '생활정보, 지도, 교통, 배달, 예약', 5),
  ('gov-public', '정부/공공서비스', '정부기관, 민원, 공공서비스', 6),
  ('real-estate', '부동산', '부동산 정보, 매물, 청약', 7),
  ('news-media', '뉴스/미디어', '뉴스, 언론사, 잡지, 미디어', 8),
  ('community', '커뮤니티', '커뮤니티, 포럼, 게시판', 9),
  ('education', '교육/학습', '온라인 강의, 학습, 자격증, 교육', 10),
  ('career-job', '취업/커리어', '채용, 구인구직, 이력서, 커리어', 11),
  ('travel-stay', '여행/숙박', '여행, 항공, 호텔, 숙박, 관광', 12),
  ('health-medical', '건강/의료', '병원, 약국, 건강정보, 의료', 13),
  ('culture-entertainment', '문화/엔터', '영화, 음악, 공연, 게임, 웹툰', 14),
  ('sns-creator', 'SNS/크리에이터', 'SNS, 유튜브, 스트리밍, 크리에이터', 15),
  ('business', '기업/비즈니스', '기업정보, B2B, 업무서비스', 16),
  ('sports', '스포츠', '스포츠 뉴스, 경기정보, 구단, 기록', 17),
  ('auto', '자동차', '자동차 정보, 중고차, 차량관리', 18),
  ('legal-admin', '법률/행정', '법률정보, 세무, 행정서비스', 19),
  ('etc', '기타', '위 분류에 해당하지 않는 사이트', 20);

INSERT INTO subcategories (category_id, slug, name, sort_order) VALUES
  ((SELECT id FROM categories WHERE slug = 'portal-search'), 'search-engine', '검색엔진', 1),
  ((SELECT id FROM categories WHERE slug = 'portal-search'), 'portal', '포털', 2),
  ((SELECT id FROM categories WHERE slug = 'portal-search'), 'map', '지도', 3),
  ((SELECT id FROM categories WHERE slug = 'portal-search'), 'mail', '메일', 4),

  ((SELECT id FROM categories WHERE slug = 'it-dev'), 'dev-tools', '개발도구', 1),
  ((SELECT id FROM categories WHERE slug = 'it-dev'), 'hosting', '호스팅', 2),
  ((SELECT id FROM categories WHERE slug = 'it-dev'), 'cloud', '클라우드', 3),
  ((SELECT id FROM categories WHERE slug = 'it-dev'), 'open-source', '오픈소스', 4),

  ((SELECT id FROM categories WHERE slug = 'shopping-price'), 'online-mall', '온라인 쇼핑몰', 1),
  ((SELECT id FROM categories WHERE slug = 'shopping-price'), 'price-compare', '가격비교', 2),
  ((SELECT id FROM categories WHERE slug = 'shopping-price'), 'product-search', '상품검색', 3),

  ((SELECT id FROM categories WHERE slug = 'finance'), 'bank', '은행', 1),
  ((SELECT id FROM categories WHERE slug = 'finance'), 'card', '카드', 2),
  ((SELECT id FROM categories WHERE slug = 'finance'), 'stock', '증권', 3),
  ((SELECT id FROM categories WHERE slug = 'finance'), 'insurance', '보험', 4),
  ((SELECT id FROM categories WHERE slug = 'finance'), 'investment', '투자', 5),

  ((SELECT id FROM categories WHERE slug = 'life-convenience'), 'life-info', '생활정보', 1),
  ((SELECT id FROM categories WHERE slug = 'life-convenience'), 'map-nav', '지도', 2),
  ((SELECT id FROM categories WHERE slug = 'life-convenience'), 'transport', '교통', 3),
  ((SELECT id FROM categories WHERE slug = 'life-convenience'), 'delivery', '배달', 4),
  ((SELECT id FROM categories WHERE slug = 'life-convenience'), 'reservation', '예약', 5),

  ((SELECT id FROM categories WHERE slug = 'gov-public'), 'gov-agency', '정부기관', 1),
  ((SELECT id FROM categories WHERE slug = 'gov-public'), 'civil-service', '민원', 2),
  ((SELECT id FROM categories WHERE slug = 'gov-public'), 'public-service', '공공서비스', 3),

  ((SELECT id FROM categories WHERE slug = 'real-estate'), 'real-estate-info', '부동산 정보', 1),
  ((SELECT id FROM categories WHERE slug = 'real-estate'), 'listing', '매물', 2),
  ((SELECT id FROM categories WHERE slug = 'real-estate'), 'subscription', '청약', 3),

  ((SELECT id FROM categories WHERE slug = 'news-media'), 'news', '뉴스', 1),
  ((SELECT id FROM categories WHERE slug = 'news-media'), 'press', '언론사', 2),
  ((SELECT id FROM categories WHERE slug = 'news-media'), 'magazine', '잡지', 3),
  ((SELECT id FROM categories WHERE slug = 'news-media'), 'media', '미디어', 4),

  ((SELECT id FROM categories WHERE slug = 'community'), 'community-general', '커뮤니티', 1),
  ((SELECT id FROM categories WHERE slug = 'community'), 'forum', '포럼', 2),
  ((SELECT id FROM categories WHERE slug = 'community'), 'board', '게시판', 3),

  ((SELECT id FROM categories WHERE slug = 'education'), 'online-lecture', '온라인 강의', 1),
  ((SELECT id FROM categories WHERE slug = 'education'), 'learning', '학습', 2),
  ((SELECT id FROM categories WHERE slug = 'education'), 'certificate', '자격증', 3),
  ((SELECT id FROM categories WHERE slug = 'education'), 'education-general', '교육', 4),

  ((SELECT id FROM categories WHERE slug = 'career-job'), 'recruit', '채용', 1),
  ((SELECT id FROM categories WHERE slug = 'career-job'), 'job-search', '구인구직', 2),
  ((SELECT id FROM categories WHERE slug = 'career-job'), 'resume', '이력서', 3),
  ((SELECT id FROM categories WHERE slug = 'career-job'), 'career', '커리어', 4),

  ((SELECT id FROM categories WHERE slug = 'travel-stay'), 'travel-general', '여행', 1),
  ((SELECT id FROM categories WHERE slug = 'travel-stay'), 'flight', '항공', 2),
  ((SELECT id FROM categories WHERE slug = 'travel-stay'), 'hotel', '호텔', 3),
  ((SELECT id FROM categories WHERE slug = 'travel-stay'), 'lodging', '숙박', 4),
  ((SELECT id FROM categories WHERE slug = 'travel-stay'), 'tour', '관광', 5),

  ((SELECT id FROM categories WHERE slug = 'health-medical'), 'hospital', '병원', 1),
  ((SELECT id FROM categories WHERE slug = 'health-medical'), 'pharmacy', '약국', 2),
  ((SELECT id FROM categories WHERE slug = 'health-medical'), 'health-info', '건강정보', 3),
  ((SELECT id FROM categories WHERE slug = 'health-medical'), 'medical', '의료', 4),

  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'movie', '영화', 1),
  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'music', '음악', 2),
  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'performance', '공연', 3),
  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'game', '게임', 4),
  ((SELECT id FROM categories WHERE slug = 'culture-entertainment'), 'webtoon', '웹툰', 5),

  ((SELECT id FROM categories WHERE slug = 'sns-creator'), 'sns', 'SNS', 1),
  ((SELECT id FROM categories WHERE slug = 'sns-creator'), 'youtube', '유튜브', 2),
  ((SELECT id FROM categories WHERE slug = 'sns-creator'), 'streaming', '스트리밍', 3),
  ((SELECT id FROM categories WHERE slug = 'sns-creator'), 'creator', '크리에이터', 4),

  ((SELECT id FROM categories WHERE slug = 'business'), 'company-info', '기업정보', 1),
  ((SELECT id FROM categories WHERE slug = 'business'), 'b2b', 'B2B', 2),
  ((SELECT id FROM categories WHERE slug = 'business'), 'business-service', '업무서비스', 3),

  ((SELECT id FROM categories WHERE slug = 'sports'), 'sports-news', '스포츠 뉴스', 1),
  ((SELECT id FROM categories WHERE slug = 'sports'), 'match-info', '경기정보', 2),
  ((SELECT id FROM categories WHERE slug = 'sports'), 'team', '구단', 3),
  ((SELECT id FROM categories WHERE slug = 'sports'), 'record', '기록', 4),

  ((SELECT id FROM categories WHERE slug = 'auto'), 'car-info', '자동차 정보', 1),
  ((SELECT id FROM categories WHERE slug = 'auto'), 'used-car', '중고차', 2),
  ((SELECT id FROM categories WHERE slug = 'auto'), 'car-management', '차량관리', 3),

  ((SELECT id FROM categories WHERE slug = 'legal-admin'), 'legal-info', '법률정보', 1),
  ((SELECT id FROM categories WHERE slug = 'legal-admin'), 'tax', '세무', 2),
  ((SELECT id FROM categories WHERE slug = 'legal-admin'), 'admin-service', '행정서비스', 3);
