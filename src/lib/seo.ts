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
