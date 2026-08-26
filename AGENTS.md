## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## 로컬 D1 데이터

로컬 D1(miniflare)은 `wrangler.jsonc`의 `database_id`를 해싱해 sqlite 파일 이름을 정한다.
초기 커밋의 `local-dev-placeholder`에서 실제 프로덕션 id로 바꾼 시점(`cf0c378`)부터
**로컬 DB가 새 빈 파일로 갈아끼워졌다.** 예전 데이터는 지워진 게 아니라
`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/` 안의 옛 해시 파일에 그대로 남아 있다
(구 분류체계라 지금 코드로는 못 쓴다).

로컬에 데이터가 없으면 프로덕션을 그대로 내려받아 쓴다:

```
npx wrangler d1 export site-directory-db --remote --output=/tmp/prod-dump.sql
# 덤프에 DROP이 없어서 기존 테이블이 있으면 실패한다. 먼저 비우고 넣을 것.
npx wrangler d1 execute site-directory-db --local --file=/tmp/prod-dump.sql
```

로컬에만 더미 사이트를 넣지 말 것 — 로컬과 프로덕션이 어긋나면 이 문제를 다시 겪는다.
