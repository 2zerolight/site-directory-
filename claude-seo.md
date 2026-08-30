# 사이트다(siteda.kr) 색인 문제 분석

작성일: 2026-08-25 · 대상: https://siteda.kr · 프로덕션 실측 기반

---

## 0. 30초 요약

Search Console의 **"적절한 표준 태그가 포함된 대체 페이지"** 자체는 대부분 **정상 동작**입니다.
다만 그 안에 **진짜 버그 하나**가 섞여 있습니다 — **페이지네이션이 canonical로 1페이지를 가리키고 있어서, 상세 페이지 597개 중 173개가 내부 링크상 고아 상태**입니다.

그런데 "구글 노출이 전혀 안 된다"의 주된 원인은 canonical이 아닙니다. 순서대로:

| 순위 | 원인 | 성격 |
|---|---|---|
| 1 | 도메인/사이트 나이 **8일** (첫 배포 2026-08-17) | 시간 문제. 정상. |
| 2 | 백링크 **0** → 크롤 우선순위 최하 | 구조 문제 |
| 3 | 브랜드명 충돌 — **siteda.co.kr이 이미 "사이트다"로 운영 중** | 전략 문제 |
| 4 | 상세 페이지 콘텐츠가 원본보다 나을 이유가 없음 (thin/aggregator) | 콘텐츠 문제 |
| 5 | 페이지네이션 canonical 버그 → 173개 페이지 고아화 | **코드 버그** |
| 6 | ~~태그 시스템이 프로덕션에서 완전히 비어 있음~~ → **2026-08-26 해결됨** (태그 151개 / 연결 687건 투입) | 해결 |
| 7 | 404를 302 리디렉션으로 처리 / sitemap에 noindex 페이지 포함 | 위생 문제 |

**8일 된 사이트가 노출 0인 것은 그 자체로는 이상하지 않습니다.** 지금 할 일은 "왜 안 나오지"가 아니라 "나올 준비가 되어 있나"를 만드는 것입니다.

---

## 1. "적절한 표준 태그가 포함된 대체 페이지"의 정체

이 리포트 항목은 **"이 URL은 다른 URL을 canonical로 지목했고, 구글도 그 판단에 동의해서 이 URL은 색인하지 않았다"**는 뜻입니다. 에러가 아니라 **구글이 내 지시를 그대로 따랐다는 보고**입니다.

현재 사이트에서 이 버킷에 들어가는 URL은 3종류입니다.

### 1-A. 필터 파라미터 — 정상 ✅

```
/category/it-dev?sub=frontend       → canonical: /category/it-dev
/category/sns-creator?platform=유튜브 → canonical: /category/sns-creator
```

`src/pages/category/[slug].astro:95` 에서 파라미터를 무시하고 항상 기본 경로를 canonical로 선언합니다.
필터 뷰는 상위 목록의 부분집합이므로 **이건 의도한 대로 잘 동작하는 것**입니다. 손대지 마세요.

### 1-B. 검색 결과 — 정상이지만 sitemap과 모순 ⚠️

```
/search?q=쇼핑 → canonical: /search + noindex
```

`search.astro`는 `noindex`인데, **`sitemap.xml`에는 `/search`가 들어 있습니다** (`src/pages/sitemap.xml.ts:19`).
"색인해달라"고 sitemap에 넣어놓고 페이지에서는 "색인하지 마라"고 하는 모순입니다. 사이트맵 전체의 신뢰도를 깎습니다.

### 1-C. 페이지네이션 — **이게 진짜 버그** 🔴

```
/category/it-dev?page=2 → canonical: /category/it-dev   ← 잘못됨
```

구글 공식 가이드는 **"페이지네이션된 각 페이지는 자기 자신을 canonical로 지정하라"**입니다.
1페이지를 canonical로 지정하면 구글은 2페이지를 색인 대상에서 제외하고, **그 페이지에 있는 링크의 가치도 크게 할인**합니다.

실측 피해 규모:

```
카테고리 21개 / 승인 사이트 597개 / 페이지당 24개

1페이지에서 링크되는 사이트 :  424개
2페이지에만 링크되는 사이트 :  173개  ← canonical로 지워진 페이지에만 존재
```

2페이지가 있는 카테고리 14개:
`it-dev(40) gov-public(40) shopping-price(37) education(37) career-job(37) culture-entertainment(37) finance(36) real-estate(36) news-media(36) travel-stay(36) life-convenience(35) health-medical(35) sns-creator(35) community(32)`

**즉 상세 페이지 597개 중 173개(29%)는 sitemap 말고는 구글이 도달할 내부 경로가 사실상 없습니다.**
sitemap만으로 발견된 URL은 "발견됨 – 색인 생성 안 됨"에 가장 잘 갇히는 유형입니다. 앞서 겪으신 그 항목과 정확히 연결됩니다.

---

## 2. 프로덕션 실측 결과

```
https://siteda.kr/                     200  TTFB 0.66~0.77s  Cache-Control 없음
https://www.siteda.kr/                 DNS 없음 (www 미설정 — 중복 도메인 리스크는 없음 ✅)
https://siteda.kr/robots.txt           200  1,935 bytes  ← 앱 코드는 ~130 bytes
https://siteda.kr/sitemap.xml          200  623 URL
https://siteda.kr/site/없는슬러그        302 → /404 (그 다음 404)
canonical 태그                          URL과 정확히 일치 ✅ (한글 슬러그 퍼센트 인코딩도 정상)
```

### sitemap 구성 (623개)

| 유형 | 개수 | 비고 |
|---|---|---|
| `/site/*` | 597 | |
| `/category/*` | 21 | |
| 정적 (`/`, `/faq`, `/submit`, `/updates`, `/search`) | 5 | `/search`는 noindex인데 포함됨 ⚠️ |
| **`/tag/*`** | **0** | **아래 참조** — 08-26 재측정 시 151개로 해결됨 ✅ |

### 태그 시스템이 프로덕션에서 비어 있음 🔴 → ✅ 2026-08-26 해결됨

`getSitemapData()`(`src/lib/db.ts:238`)는 태그를 조회하는데 결과가 0건이고,
**홈페이지 HTML에도 `/tag/` 링크가 단 하나도 없습니다.**

→ `site_tags` 테이블이 프로덕션에서 비어 있습니다.

이건 단순 누락이 아니라 뼈아픕니다. 디렉토리 사이트의 내부 링크 그래프는 보통
`홈 → 카테고리 → 상세` 3단계인데, 태그가 있어야 **상세 ↔ 상세 수평 연결**이 생깁니다.
지금은 그 층이 통째로 없어서 597개 상세 페이지가 서로 완전히 고립돼 있습니다
(`관련 사이트` 블록만 유일한 수평 링크).

> **2026-08-26 재측정 — 해결됨.** 프로덕션 sitemap이 623개 → **773개**로 늘었고
> `/tag/` URL이 0개 → **151개**가 되었습니다. `site_tags` 연결도 687건이 들어가
> 상세↔상세 수평 링크 층이 복구됐습니다. 아래 실행 계획 #6은 완료 처리하세요.
> (참고: 이 문서의 최초 측정은 08-25 22시경이었고, 그 직후 데이터가 투입됐습니다.)

### robots.txt에 `User-agent: *` 그룹이 2개 ⚠️

Cloudflare의 **관리형 robots.txt(AI Crawl Control)** 가 앱 응답 **앞에** 자체 블록을 주입하고 있습니다.

```
# BEGIN Cloudflare Managed content
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /
... (ClaudeBot, GPTBot, CCBot 등 Disallow)
# END Cloudflare Managed Content

User-agent: *          ← 우리 앱이 만든 두 번째 그룹
Allow: /
Disallow: /dashboard
Disallow: /go/
Sitemap: https://siteda.kr/sitemap.xml
```

- **Googlebot은 영향 없습니다.** 같은 토큰의 그룹을 병합해서 읽습니다. `Google-Extended` 차단은 Gemini 학습용이지 검색 색인과 무관합니다.
- 다만 **네이버 Yeti 등 일부 크롤러는 매칭되는 첫 그룹만 읽고 멈춥니다.** 그러면 `Sitemap:` 지시를 놓칩니다. 한국 시장에서 이건 실질적인 손해입니다.

### 404 처리가 302 리디렉션 🟡

```
/site/없는슬러그 → 302 → /404 (200이 아니라 404 반환하므로 최악은 아님)
```

`site/[slug].astro:22`, `category/[slug].astro:34`, `tag/[slug].astro:12` 모두 `Astro.redirect('/404')`.
구글은 이걸 **"페이지에 리디렉션이 있음"**으로 분류합니다. 없는 페이지는 곧바로 404를 반환해야 깔끔합니다.

### 캐시 헤더 없음 🟡

모든 요청이 D1을 여러 번 조회하는 SSR이고 `Cache-Control` 헤더가 전혀 없습니다.
TTFB 0.7초 × 600페이지 크롤 = 크롤 예산 낭비. 색인 차단 요인은 아니지만 신규 사이트의 크롤 속도에 직접 영향을 줍니다.

---

## 3. 노출 0의 진짜 원인 (코드 밖)

### 3-A. 사이트가 8일 됐습니다

첫 커밋 `2026-08-17`, 오늘 `2026-08-25`. 신규 도메인이 색인 → 노출 → 순위까지 가는 데 보통 **수 주에서 수 개월**입니다.
특히 **디렉토리/애그리게이터**는 구글이 가장 보수적으로 다루는 유형이라 더 걸립니다.
지금 시점의 노출 0은 진단 대상이 아니라 **기다림의 정상 구간**입니다.

### 3-B. 브랜드명이 이미 점유돼 있습니다 🔴

**`siteda.co.kr`이 "사이트다"라는 이름으로 이미 운영 중인 커뮤니티 사이트입니다.**

신규 사이트가 처음으로 노출을 얻는 통로는 거의 항상 **브랜드 검색어**입니다.
그런데 "사이트다"를 검색하면 기존 siteda.co.kr이 먼저 나옵니다. 첫 관문이 막혀 있는 상태입니다.

대응 선택지:
1. 브랜드 쿼리를 **"사이트다 디렉토리"**, **"siteda.kr"** 같은 변별력 있는 조합으로 밀기
2. 홈 `<title>`을 `사이트다`(현재) 대신 **`사이트다 – 국내 웹사이트 디렉토리`** 로 변경해 구분 신호 주기
3. `Organization` JSON-LD에 `sameAs`(운영 SNS/블로그)를 추가해 개체 구분 신호 강화

### 3-C. 상세 페이지가 원본을 이길 이유가 없습니다 🔴

현재 `/site/정부24-yvst5o` 페이지가 담고 있는 것:
- 사이트명, 도메인, 한 줄 태그라인, 설명, 카테고리, 접속상태 칩

구글 입장에서 이 페이지가 `gov.kr` 원본보다 사용자에게 나은 점이 **없습니다**.
이게 "발견됨 – 색인 생성 안 됨"의 근본 원인입니다. 기술 이슈를 다 고쳐도 이건 그대로 남습니다.

원본에 없는 정보를 넣어야 합니다:
- 실제 이용 후기 (리뷰 기능은 이미 있음 — 비어 있을 뿐)
- **"이 사이트로 뭘 할 수 있나"** 구체 목록 (예: 정부24 → 주민등록등본 발급, 전입신고, 인감증명…)
- 유사/대체 사이트 비교 (정부24 vs 홈택스 vs 국민신문고 — 뭘 어디서 하나)
- 모바일 앱 유무, 공휴일 운영 여부, 로그인 수단(공동인증서/간편인증) 같은 실무 정보

### 3-D. 백링크 0

새 도메인 + 외부 링크 0 = 크롤 우선순위 바닥.
**→ 오늘 같이 만들고 있는 인증 배지 프로그램이 정확히 이 문제를 푸는 수단입니다.**
배지 링크는 반드시 홈이 아니라 **해당 상세 페이지(`/site/{slug}`)**로 걸어야 합니다. 그래야 색인이 안 되던 깊은 페이지에 크롤 경로가 생깁니다.

---

## 4. 실행 계획

### 지금 (코드 — 1시간 내)

| # | 작업 | 파일 |
|---|---|---|
| 1 | **페이지네이션 self-canonical** — `?page=2` 이상은 자기 URL을 canonical로 | `category/[slug].astro`, `tag/[slug].astro` |
| 2 | sitemap에서 `/search` 제거 | `sitemap.xml.ts:19` |
| 3 | 없는 페이지는 **302 대신 404 직접 반환** | `site/`, `category/`, `tag/[slug].astro` |
| 4 | `Cache-Control: public, max-age=0, s-maxage=600` 추가 | `Layout` 또는 미들웨어 |
| 5 | 홈 `<title>`에 설명 붙이기 (브랜드 변별) | `index.astro:30` |

1번 구현 방향 (Layout에 `canonicalSearch` 같은 옵션을 받아 페이지 파라미터만 보존):

```astro
canonicalPath={page > 1 ? `${pageUrl({ page, sub: activeSubcategory?.slug, platform: activePlatform })}` : `/category/${category.slug}`}
```

단, `sub`/`platform`은 canonical에서 계속 떨어뜨리고 **`page`만 살리는 것**이 핵심입니다.

### 이번 주 (데이터)

| # | 작업 | 왜 |
|---|---|---|
| ~~6~~ | ~~**태그 데이터 채우기**~~ — **완료 (08-26 확인: 태그 151개 / 연결 687건)** | 상세↔상세 수평 링크 복구. 173개 고아 페이지 문제도 같이 완화됨 |
| 7 | 카테고리 21개에 **200~400자 고유 해설** 작성 | 현재 `description` 한 줄로는 카테고리 페이지도 thin |
| 8 | Cloudflare 관리형 robots.txt 정리 (그룹 1개로) | 네이버 Yeti가 sitemap 지시를 읽게 |
| 9 | **네이버 서치어드바이저 / 빙 웹마스터 등록** | 한국 시장에서 초기 노출은 네이버가 훨씬 빠름 |

### 2~8주 (콘텐츠 + 링크)

| # | 작업 |
|---|---|
| 10 | **인증 배지 프로그램 배포** — 상세 페이지로 직접 링크, 앵커/alt는 브랜드+사이트명 조합으로 다양화 |
| 11 | 상위 50개 사이트 상세 페이지에 3-C의 고유 정보 채워넣기 (전량 말고 대표부터) |
| 12 | Search Console에서 **카테고리 21개 우선 색인 요청** (상세 597개 일괄 요청은 의미 없음) |
| 13 | 4주 뒤 "발견됨 – 색인 생성 안 됨" 수치 재측정 |

---

## 5. 하지 말아야 할 것

- ❌ **필터 파라미터(`?sub=`, `?platform=`)를 self-canonical로 바꾸기** — 진짜 중복 색인을 만듭니다. 지금이 맞습니다.
- ❌ **597개 URL 전부 색인 요청** — 할당량만 태우고 신뢰도에 도움 안 됩니다.
- ❌ **배지 링크를 홈으로 걸기** — 홈만 강해지고 정작 색인 안 되는 깊은 페이지는 그대로입니다.
- ❌ **배지 앵커/alt 텍스트를 전부 동일 키워드로 통일** — 위젯 링크 스팸으로 분류될 수 있습니다. 브랜드명 고정 + 사이트명만 변수.
- ❌ **소유권 확인 없이 "인증" 표기** — 다행히 `verifyOwnership()`(메타태그/DNS TXT)이 이미 구현돼 있으므로, 배지도 `ownership_verified = 1`일 때만 "인증", 아니면 "등록 사이트"로 문구를 낮춰야 합니다.

---

## 6. 근거 (실측 명령)

```bash
curl -sSI https://siteda.kr/                      # 200, Cache-Control 없음
curl -sS  https://siteda.kr/robots.txt            # User-agent: * 그룹 2개
curl -sS  https://siteda.kr/sitemap.xml | grep -c "<url>"   # 08-25: 623 → 08-26: 773
curl -sS  https://siteda.kr/sitemap.xml | grep -c "/tag/"   # 08-25:   0 → 08-26: 151
curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" \
     https://siteda.kr/site/does-not-exist-xyz    # 302 → /404
```

카테고리별 사이트 수는 각 `/category/*` 페이지의 "N개 사이트" 표기에서 수집 (합계 597, 1페이지 노출 424, 2페이지 전용 173).

---

# 부록 — 2026-08-30 재측정 (claude-seo 스킬)

실측 기준: 프로덕션 `https://siteda.kr` 전수 크롤(홈 + 카테고리 21×2p + 태그 151) + 프로덕션 D1 직접 조회.

## A. §4 "지금" 체크리스트 — 5개 전부 완료 ✅

| # | 작업 | 상태 | 실측 근거 |
|---|---|---|---|
| 1 | 페이지네이션 self-canonical | ✅ | `?page=2` → `canonical: .../it-dev?page=2`. `?page=2&sub=frontend` → `?page=2` (sub만 정확히 탈락) |
| 2 | sitemap에서 `/search` 제거 | ✅ | 780 URL 중 `/search` 0건. `/search`는 여전히 `noindex, nofollow` |
| 3 | 404 직접 반환 | ✅ | `/site|/category|/tag` 없는 슬러그 전부 302 없이 **404** |
| 4 | `Cache-Control` | ✅ | `public, max-age=0, s-maxage=600`. TTFB 0.77s → **0.31s** |
| 5 | 홈 title 브랜드 변별 | ✅ | `사이트다 – 국내 웹사이트 디렉토리` |

부수적으로 **Cloudflare 관리형 robots.txt 블록도 사라졌습니다**(§2 항목 8). 현재 `User-agent: *` 그룹 1개 + `Sitemap:` 1줄, 130 bytes. 네이버 Yeti가 sitemap 지시를 놓치던 문제 해소.

§4 항목 7(카테고리 고유 해설)도 완료 — 21개 전부 200~256자 고유 인트로 확보.

## B. §1-C 고아 페이지 173개 — 해소됨 ✅

내부 링크 그래프 전수 크롤 결과 (퍼센트 인코딩 정규화 후):

```
사이트맵 상세 페이지            600
홈 + 카테고리 1p + 태그로 도달   545  (90.8%)
  ├ 카테고리 1페이지            425
  ├ 태그 페이지                 363
  └ 홈                           16
카테고리 2페이지 추가 시        600  (100%)
2페이지에만 있는 사이트          55  (173 → 55)
내부 링크로 전혀 도달 불가        0
```

2페이지가 self-canonical이 되면서 그 55개도 색인 가능 경로를 확보했습니다. **진성 고아 0개.**

## C. 남은 문제 (우선순위순)

### C-1 🔴 Critical — 상세 페이지 고유 콘텐츠 ~150자

두 상세 페이지 텍스트를 라인 단위로 차집합한 결과, 상세 페이지 1,164자 중 "고유" 499자.
그 499자에서 관련 사이트 블록(다른 사이트 설명)을 빼면 **실제 페이지 고유 산문은 약 150자**
— 태그라인 1줄 + 설명 1문장 + 기능 2개 + 태그 3개.

프로덕션 `reviews` 테이블 **총 1건**. §3-C가 지목한 "원본을 이길 이유가 없음"이 그대로 남아 있습니다.
기술 이슈를 전부 고친 지금, **"발견됨 – 색인 생성 안 됨"의 유일한 남은 원인**입니다.

- 반증: 상위 20개 상세에 고유 정보 400자+ 투입 후 4주 뒤 색인률이 안 오르면 콘텐츠가 아니라 권위 문제.
- 선행지표: GSC "발견됨 – 색인 생성 안 됨" 대비 "크롤링됨 – 색인 생성 안 됨" 비율 (후자로 이동 = 크롤은 되기 시작한 것).

### C-2 🟠 High — 승인 사이트 600개 중 237개(39.5%)가 태그 0개

```
태그 0개 : 237   태그 1개 : 163   태그 2개 : 112   태그 3개 : 52   태그 4개 : 36
```

태그 상위 미보유 카테고리: `gov-public(24) career-job(22) etc(21) life-convenience(18) shopping-price(16) it-dev(16) education(16)`

태그 층이 커버하는 상세는 363개뿐 — 나머지 237개는 여전히 카테고리 목록이 유일한 유입 경로입니다.
(태그 자체는 건강합니다. 151개 전부 **최소 3개** 사이트를 보유 — thin 태그 페이지 0개.)

### C-3 🟠 High — `?page=2`의 title/description이 1페이지와 완전히 동일

self-canonical로 바꾼 결과 2페이지가 색인 대상이 됐는데, `<title>`과 `description`이 1페이지와 글자 하나까지 같습니다. GSC "중복 제목" 및 자기잠식 신호.

→ `IT/개발 (2페이지) | 사이트다` 형태로 분리, description도 페이지 번호 반영.

### C-4 🟡 Medium

| 항목 | 실측 | 조치 |
|---|---|---|
| `Organization` JSON-LD 없음 | 홈 JSON-LD는 `WebSite` 하나뿐 | `Organization` + `sameAs` 추가 (§3-B 브랜드 충돌 대응) |
| 카테고리 meta description이 200~256자 | 온페이지 인트로를 그대로 재사용 | 한국어 SERP 스니펫은 ~80자에서 잘림. 별도 요약문 필요 |
| 네이버/빙 인증 메타태그 없음 | `naver-site-verification`, `msvalidate` 모두 0건 | §4 항목 9 미착수 — 한국 시장 초기 노출은 네이버가 훨씬 빠름 |
| 배지 프로그램 사실상 정지 | `ownership_verified=1` **19/600** | §4 항목 10의 백링크 엔진이 아직 안 돌고 있음 |

### C-6 🔴 신규 발견 — 범위 밖 페이지가 무한히 색인 후보로 열려 있었음

self-canonical 로 바꾼 부작용입니다. `?page=99` 가 **200 + 자기 자신 canonical + 빈 목록**으로
응답하고 있었습니다(프로덕션 실측 확인). 목록 페이지마다 무한한 빈 URL 이 색인 후보가 되는
index bloat 구멍입니다. `page > totalPages` 면 404 로 끊도록 수정했습니다.

> 정정: 최초 보고에서 "카테고리 페이지에 `ItemList` 없음"이라고 적었으나 **오류**입니다.
> 상세 페이지 JSON-LD를 보고 카테고리로 넘겨짚은 것이고, 카테고리·태그 페이지에는
> `ItemList`(24개) + `BreadcrumbList`가 이미 들어 있었습니다.

### C-5 🟢 Low

- 이미지 25개 전부 `width`/`height` 미지정 → CLS 위험 (alt는 전부 `alt=""` 장식 처리, 로고 옆에 사이트명 텍스트가 있으므로 타당)
- 태그 151개 중 홈에서 직접 링크되는 건 16개. 나머지 135개는 상세 페이지 경유(depth 3)
- `llms.txt` 없음 (선택 사항, 구글 검색은 무시)

## D. 헬스 스코어

| 항목 | 가중치 | 점수 |
|---|---|---|
| Technical SEO | 22% | 88 |
| Content Quality | 23% | 40 |
| On-Page SEO | 20% | 72 |
| Schema | 10% | 65 |
| Performance | 10% | 80 |
| AI Search Readiness | 10% | 45 |
| Images | 5% | 70 |
| **종합** | | **66 / 100** |

기술 점수는 이미 높습니다. **총점을 누르고 있는 건 콘텐츠 하나(가중치 23%)입니다.**
다음 작업은 코드가 아니라 C-1(상세 콘텐츠)과 C-2(태그 237개)입니다.

## E. 재현 명령

```bash
curl -sS https://siteda.kr/sitemap.xml | grep -c '<url>'                    # 780
curl -sS "https://siteda.kr/category/it-dev?page=2" | grep -o 'canonical[^>]*'
curl -sS -o /dev/null -w '%{http_code}\n' https://siteda.kr/site/nope-xyz   # 404
npx wrangler d1 execute site-directory-db --remote \
  --command "SELECT COUNT(*) FROM sites s WHERE s.status='approved' \
             AND NOT EXISTS(SELECT 1 FROM site_tags st WHERE st.site_id=s.id)"  # 237
```

## F. 2026-08-30 조치 완료 (코드)

| 항목 | 파일 | 내용 |
|---|---|---|
| C-3 페이지네이션 중복 제목 | `category/[slug].astro`, `tag/[slug].astro` | 2페이지 이상 `제목 (N페이지)`, description·`ItemList.name`도 페이지 번호 반영 |
| C-4 meta description 길이 | `lib/seo.ts` (신규), 위 두 파일 | 온페이지 해설(252자)과 분리. 대표 사이트 이름을 90자 예산 안에서만 넣고, 16자 넘는 긴 이름은 후보에서 제외. 실측 60~75자 |
| C-4 `Organization` 부재 | `index.astro`, `lib/site.ts` | `Organization`(`@id` 고정, logo, contactPoint) + `WebSite.publisher` 연결. `SITE_SAME_AS` 상수를 두고 운영 채널이 생기면 채우도록 함(비어 있으면 키 자체를 생략) |
| `ItemList.url`이 항상 1페이지 | 위 두 파일 | 현재 페이지 URL을 가리키도록 수정 |
| **C-6 범위 밖 페이지 200** | 위 두 파일 | `page > totalPages` → 404 |

로컬 실측 (`astro dev` + 프로덕션 덤프 597건):

```
/category/it-dev          200  IT/개발 | 사이트다              desc 75자
/category/it-dev?page=2   200  IT/개발 (2페이지) | 사이트다     desc 73자  canonical=?page=2
/category/it-dev?page=3   404   ← 범위 밖
/category/it-dev?page=99  404
/tag/it뉴스?page=2         404   ← 7개뿐이라 2페이지 없음
/category/it-dev?sub=frontend  200  canonical=/category/it-dev (필터는 그대로 흡수)
```

`astro check` 0 errors · `astro build` 성공.

**남은 것은 코드가 아닙니다** — C-1(상세 페이지 고유 콘텐츠), C-2(태그 0개 사이트 237개),
네이버 서치어드바이저 등록, 배지 프로그램 가동(현재 19/600 인증).

## G. 2026-08-30 C-1 착수 — 비교표 블록

상세 페이지에 **"{사이트명}과 비슷한 사이트, 뭐가 다른가"** 표를 추가했습니다.
디렉토리 상세가 원본 사이트를 이길 수 있는 거의 유일한 지점입니다 — 원본은 자기 얘기만 하지
경쟁 서비스와 자기를 나란히 놓지 않습니다. §3-C가 요구한 "유사/대체 사이트 비교"에 해당합니다.

표에 들어가는 값은 **전부 DB에 이미 저장된 사실**(`service_keywords`, `site_type`,
`service_region`)이고 우열 판단은 넣지 않습니다. 없는 정보를 생성하면 그 순간 이 페이지는
원본보다 나쁜 페이지가 되므로, 자동 생성 문장은 리드 한 줄뿐입니다.

비교 대상 선정 (`getComparableSites`, `lib/db.ts`) — 기존 `getRelatedSites`는 "같은 카테고리
최신순"이라 비교용으로 못 씁니다(여행 카테고리의 캠핑용품점 옆에 길찾기 앱이 붙음).
아래 중 **최소 하나**를 만족해야 후보로 인정하고, 조회수는 tiebreaker 로만 씁니다.

- 같은 소분류 / 태그 1개 이상 공유 / 같은 사이트 유형

프로덕션 데이터 기준 커버리지:

```
승인 사이트            600
비교표 노출 (피어 2곳+) 559  (93%)
피어 1곳뿐 → 블록 숨김   12
피어 없음   → 블록 숨김   29
```

효과 (정부24 상세, 로컬 실측):

```
              이전    이후
전체 텍스트    1,164자  1,544자
고유 텍스트      499자    775자  (42% → 50%)
  ├ 비교표 기여    —      344자
내부 링크        +0       +4개  ← C-2 수평 링크에도 기여
```

부수 수정: `josa()` (`lib/seo.ts`) — 받침에 따라 와/과를 고릅니다. 없으면 600페이지가
전부 "국가기술표준원와"로 나갑니다.

**아직 C-1 이 닫힌 건 아닙니다.** 비교표는 저장된 사실을 재배열한 것이라 "이 사이트로 뭘
할 수 있나"의 깊이(예: 정부24 → 주민등록등본 발급 절차)는 여전히 없습니다. 그건 사람이
쓰거나 리뷰가 쌓여야 하고, 대표 사이트부터 채우는 게 §4 항목 11입니다.
