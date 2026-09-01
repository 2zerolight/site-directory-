/**
 * 목록 페이지(카테고리·태그)의 meta description 을 만든다.
 *
 * 온페이지 해설과 meta description 은 역할이 다르다. 해설은 페이지가 thin 하지 않게
 * 만드는 본문이고, meta description 은 SERP 스니펫이다. 한국어 스니펫은 80자 안팎에서
 * 잘리므로 200자짜리 해설을 그대로 재사용하면 문장 중간이 끊긴다.
 *
 * 대표 사이트 이름을 몇 개 넣어 페이지마다 다른 문장을 만들되, 예산을 넘기면 이름을
 * 빼서 잘리지 않게 한다. 이름이 긴 사이트("아이티이지 | 토탈 IT 인프라 서비스 제공 기업"
 * 같은 것)는 스니펫을 혼자 다 잡아먹으므로 애초에 후보에서 제외한다.
 */
const MAX_LENGTH = 90;
const MAX_NAME_LENGTH = 16;
const MAX_NAMES = 3;

export function buildListDescription(lead: string, sampleNames: string[]): string {
  const base = `${lead}.`;
  const candidates = sampleNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name.length <= MAX_NAME_LENGTH)
    .slice(0, MAX_NAMES);

  const picked: string[] = [];
  for (const name of candidates) {
    const next = `${lead}. ${[...picked, name].join(', ')} 등을 한곳에서 찾아보세요.`;
    if (next.length > MAX_LENGTH) break;
    picked.push(name);
  }

  return picked.length > 0 ? `${lead}. ${picked.join(', ')} 등을 한곳에서 찾아보세요.` : base;
}

/**
 * 한국어 조사를 받침 유무에 맞춰 고른다. "국가기술표준원와"처럼 나가면 사람이 쓴 글로
 * 안 읽히고, 상세 페이지 문장은 전부 사이트명으로 시작하므로 그냥 두면 600페이지에서
 * 다 틀린다.
 *
 * 한글 음절은 0xAC00 부터 28개 단위로 종성이 순환한다. 나머지가 0이면 받침이 없다.
 * 한글이 아닌 문자로 끝나면(영문·숫자) 받침 없는 쪽을 쓴다. 읽는 방식이 사람마다
 * 달라서 어느 쪽도 확실하지 않고, 이 경우 받침 없는 쪽이 덜 어색하다.
 */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 예: josa('정부24', '과', '와') → '와', josa('국가기술표준원', '과', '와') → '과' */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  return hasFinalConsonant(word) ? withFinal : withoutFinal;
}

/**
 * 사이트 <title> 에서 브랜드명만 남긴다.
 *
 * 등록 폼은 og:site_name 이 없으면 <title> 을 그대로 이름으로 쓴다. 그런데 많은 사이트가
 * 검색 노출을 노리고 제목에 홍보 문구를 붙여둔다.
 *
 *   "리뷰노트 - 대한민국 체험단 수 1위, 신뢰받는 리뷰"
 *   "무료 URL 단축 · 텍스트 전송 · P2P 파일공유 - ww2.kr"
 *
 * 그대로 두면 상세 페이지의 h1 과 title 이 광고 문구가 되고, 검증한 적 없는 "1위" 같은
 * 주장을 디렉토리가 그대로 싣게 된다. 주소(slug)에도 그대로 박힌다.
 *
 * 위 두 예처럼 브랜드가 앞에 오기도 하고 뒤에 오기도 해서, 자르는 위치를 고정할 수 없다.
 * 대신 구분자 양쪽 중 짧은 쪽을 고른다 - 홍보 문구는 거의 항상 브랜드명보다 길다.
 *
 * 고른 쪽이 원문의 60% 를 넘으면 애매한 경우로 보고 원문을 그대로 둔다. 어차피 관리자가
 * 검토 화면에서 고칠 수 있으므로, 확신이 없으면 건드리지 않는 쪽이 낫다.
 *
 * 가운뎃점(·)은 구분자로 쓰지 않는다. "텍스트 전송 · 파일공유"처럼 설명 안에서 항목을
 * 나열할 때 더 많이 쓰여서, 이걸로 자르면 문장 조각만 남는다.
 */
const NAME_SEPARATORS = ['|', ' - ', ' – ', ' — ', ' :: '];

export function cleanSiteName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;

  for (const separator of NAME_SEPARATORS) {
    const index = trimmed.indexOf(separator);
    if (index <= 0) continue;

    const head = trimmed.slice(0, index).trim();
    const tail = trimmed.slice(index + separator.length).trim();
    const shorter = head.length <= tail.length ? head : tail;

    if (shorter.length >= 2 && shorter.length <= trimmed.length * 0.6) {
      return shorter;
    }
  }

  return trimmed;
}
