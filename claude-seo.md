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
| 6 | 태그 시스템이 프로덕션에서 완전히 비어 있음 (내부 링크 밀도 0) | **데이터 누락** |
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
| **`/tag/*`** | **0** | **아래 참조** 🔴 |

### 태그 시스템이 프로덕션에서 비어 있음 🔴

`getSitemapData()`(`src/lib/db.ts:238`)는 태그를 조회하는데 결과가 0건이고,
**홈페이지 HTML에도 `/tag/` 링크가 단 하나도 없습니다.**

→ `site_tags` 테이블이 프로덕션에서 비어 있습니다.

이건 단순 누락이 아니라 뼈아픕니다. 디렉토리 사이트의 내부 링크 그래프는 보통
`홈 → 카테고리 → 상세` 3단계인데, 태그가 있어야 **상세 ↔ 상세 수평 연결**이 생깁니다.
지금은 그 층이 통째로 없어서 597개 상세 페이지가 서로 완전히 고립돼 있습니다
(`관련 사이트` 블록만 유일한 수평 링크).

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
| 6 | **태그 데이터 채우기** — 597개 사이트에 태그 부여 | 상세↔상세 수평 링크 복구. 173개 고아 페이지 문제도 같이 완화됨 |
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
curl -sS  https://siteda.kr/sitemap.xml | grep -c "<url>"   # 623
curl -sS  https://siteda.kr/sitemap.xml | grep -c "/tag/"   # 0
curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" \
     https://siteda.kr/site/does-not-exist-xyz    # 302 → /404
```

카테고리별 사이트 수는 각 `/category/*` 페이지의 "N개 사이트" 표기에서 수집 (합계 597, 1페이지 노출 424, 2페이지 전용 173).
