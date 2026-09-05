import { SITE_URL } from './site';

/**
 * IndexNow: 변경된 URL 을 검색엔진에 즉시 알린다.
 *
 * 하나의 엔드포인트가 Bing, 네이버, Yandex, Seznam, Yep 으로 전달한다.
 * **구글은 참여하지 않는다** - 구글용으로는 여전히 사이트맵과 Search Console 뿐이다.
 * 그래도 넣는 이유는 두 가지다. 한국 시장에서 초기 노출은 네이버가 훨씬 빠르고,
 * Bing 색인은 ChatGPT·Copilot 이 인용할 근거가 된다.
 *
 * 키는 비밀이 아니다. public/<key>.txt 로 그대로 공개해야 소유 확인이 되기 때문에
 * 환경변수가 아니라 여기 둔다. 파일과 이 값이 어긋나면 전부 403 이 된다.
 */
export const INDEXNOW_KEY = 'd43a9bde7609557fad0e653f7e3399496666206a06a1d893';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** 한 번에 보낼 수 있는 최대 URL 수. 규격상 10,000 개다. */
const MAX_URLS = 10_000;

export function indexNowKeyLocation(): string {
  return new URL(`/${INDEXNOW_KEY}.txt`, SITE_URL).toString();
}

/**
 * 변경된 URL 을 알린다. 실패해도 호출한 쪽의 동작을 막지 않는다.
 *
 * 사이트 승인·수정은 이미 DB 에 반영된 뒤에 부르므로, 알림이 실패했다고 그 작업을
 * 되돌릴 이유가 없다. 텔레그램 알림과 같은 방침이다.
 */
export interface IndexNowResult {
  ok: boolean;
  status?: number;
  /** 실패했을 때 원인 파악용. IndexNow 는 4xx 에 JSON 으로 errorCode 와 message 를 준다. */
  detail?: string;
}

export async function submitToIndexNow(paths: string[]): Promise<IndexNowResult> {
  const urlList = [...new Set(paths)]
    .map((path) => (path.startsWith('http') ? path : new URL(path, SITE_URL).toString()))
    .slice(0, MAX_URLS);

  if (urlList.length === 0) return { ok: true };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).hostname,
        key: INDEXNOW_KEY,
        keyLocation: indexNowKeyLocation(),
        urlList,
      }),
    });
    // 200 은 접수, 202 는 접수했으나 키 확인 대기. 둘 다 정상이다.
    if (response.ok) return { ok: true, status: response.status };
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    return { ok: false, status: response.status, detail };
  } catch (err) {
    // 엣지에서 fetch 자체가 실패한 경우. 상태 코드가 없으니 예외 메시지를 남긴다.
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}
