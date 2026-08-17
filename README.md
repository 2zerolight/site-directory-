# 사이트다

분야별로 국내 웹사이트를 검색하고 발견하는 디렉토리 플랫폼입니다.

- 배포 주소: https://siteda.kr
- 스택: Astro (server output) + Cloudflare Workers + D1
- 배포 방식: `main` 브랜치에 push하면 Cloudflare Workers Builds가 자동으로 빌드·배포합니다.

## 🧞 로컬 개발 명령어

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`              | 의존성 설치                                        |
| `npm run dev`              | 로컬 개발 서버 실행 (`localhost:4321`)               |
| `npm run build`            | `./dist/`에 프로덕션 빌드 생성                        |
| `npm run preview`          | 배포 전 로컬에서 빌드 결과 미리보기                     |

## 데이터베이스 (D1)

- 로컬: `npx wrangler d1 execute site-directory-db --local --command "..."`
- 프로덕션: `npx wrangler d1 execute site-directory-db --remote --command "..."`

관리자용 일괄 등록/검수 스크립트는 `scripts/` 디렉토리를 참고하세요.

## 관리자 페이지

`/admin`에서 로그인 후 사이트 등록 승인/거절을 처리할 수 있습니다. 비밀번호는 Cloudflare Worker 시크릿(`ADMIN_PASSWORD`)으로 관리됩니다.
