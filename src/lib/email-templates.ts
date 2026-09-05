import type { SiteWithCategory } from '../types';
import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from './site';
import { VERIFICATION_META_NAME, VERIFICATION_TXT_SUBDOMAIN } from './constants';
import { decodeHostnameForDisplay } from './urls';
import { josa } from './seo';

/*
  관리자가 제출자에게 보내는 메일 문안.

  메일은 시스템이 보내지 않는다. 관리자가 지메일에서 직접 보내므로 여기서는 제목과
  본문 텍스트만 만들고, /dashboard/email/[id] 페이지가 복사 버튼과 Gmail 작성 링크를
  붙인다. 그래서 전부 서식 없는 평문이다. HTML 을 만들어봐야 지메일에 붙여넣으면
  깨지거나 스타일이 날아간다.

  문구는 FAQ(/faq)와 인증 페이지(/submit/verify)의 설명과 어긋나면 안 된다. 인증은
  선택이고, 배지는 무료이며, 상호 링크 조건이 없다는 세 가지는 어디서나 같게 말한다.
*/

export type EmailTemplateKey =
  | 'approve_unverified'
  | 'approve_verified'
  | 'approve_third_party'
  | 'reject'
  | 'request_info'
  | 'verify_link';

export interface EmailDraft {
  key: EmailTemplateKey;
  label: string;
  /** 어떤 상황에 쓰는 문안인지. 관리자 화면에만 보인다. */
  hint: string;
  subject: string;
  body: string;
}

export interface RejectReason {
  id: string;
  label: string;
  text: string;
}

/*
  거절 사유. 관리자가 여러 개를 골라 합친다. 각 문장은 "왜 안 됐는지"와 "그래서 뭘
  하면 되는지"를 한 덩어리로 담아, 사유만 나열해도 답장 없이 재등록으로 이어지게 한다.
*/
export const REJECT_REASONS: RejectReason[] = [
  {
    id: 'unreachable',
    label: '사이트 접속 불가',
    text: '사이트에 접속되지 않았습니다. 여러 차례 확인했지만 페이지가 열리지 않거나 오류가 반환되었습니다. 접속이 정상화된 뒤 다시 등록해 주세요.',
  },
  {
    id: 'duplicate',
    label: '이미 등록된 사이트',
    text: '같은 사이트가 이미 등록되어 있습니다. 기존 등록 정보에 수정이 필요하면 이 메일에 답장으로 알려주세요.',
  },
  {
    id: 'insufficient',
    label: '소개·설명 부족',
    text: '입력하신 소개와 상세 설명만으로는 어떤 서비스인지 파악하기 어려웠습니다. 사이트가 하는 일, 이용 대상, 주요 기능을 구체적으로 적어 다시 등록해 주세요.',
  },
  {
    id: 'not_ready',
    label: '준비 중·내용 없음',
    text: '사이트가 아직 준비 중이거나 내용이 거의 없는 상태였습니다. 실제 서비스가 운영되는 시점에 다시 등록해 주세요.',
  },
  {
    id: 'mismatch',
    label: '등록 정보와 실제 불일치',
    text: '등록 정보와 실제 사이트 내용이 달랐습니다. 사이트 이름, 주소, 소개가 실제 서비스와 일치하도록 다시 등록해 주세요.',
  },
  {
    id: 'out_of_scope',
    label: '디렉토리 범위 밖',
    text: `${SITE_NAME}는 국내 웹사이트 디렉토리라, 한국어 이용자를 대상으로 하지 않거나 웹사이트가 아닌 항목(SNS 계정, 앱 스토어 링크, 단일 게시글 등)은 등록하지 않습니다.`,
  },
  {
    id: 'spam',
    label: '광고·스팸·유해',
    text: '광고·스팸성 등록이거나 불법·유해 콘텐츠로 판단되는 사이트는 등록하지 않습니다.',
  },
  {
    id: 'policy',
    label: '등록 기준 불충족',
    text: `${SITE_NAME} 이용약관 또는 등록 기준에 맞지 않았습니다. (${SITE_URL}/terms)`,
  },
];

const SIGNATURE = `감사합니다.
${SITE_NAME} 드림
${SITE_URL}
${CONTACT_EMAIL}`;

const GREETING = `안녕하세요, ${SITE_NAME}입니다.`;

function verificationSteps(site: SiteWithCategory, hostname: string): string {
  const token = site.verification_token ?? '';
  return `인증 방법은 두 가지 중 편한 쪽 하나면 됩니다.

1. 홈페이지 <head> 에 메타태그 추가
   <meta name="${VERIFICATION_META_NAME}" content="${token}" />

2. 도메인 DNS 에 TXT 레코드 추가
   호스트: ${VERIFICATION_TXT_SUBDOMAIN}.${hostname}
   값: ${token}

적용한 뒤 인증 페이지에서 "지금 확인" 버튼을 누르면 바로 인증됩니다. DNS 방식은 반영까지 몇 분에서 몇 시간 걸릴 수 있습니다.`;
}

function verificationLinkBlock(site: SiteWithCategory): string {
  if (!site.verification_secret) {
    return `▶ 인증 페이지
인증 링크가 아직 발급되지 않았습니다. 이 메일에 답장해 주시면 바로 보내드리겠습니다.`;
  }
  return `▶ 인증 페이지 (이 사이트 전용 주소입니다. 외부에 공유하지 마세요)
${SITE_URL}/submit/verify/${site.verification_secret}`;
}

function siteLine(site: SiteWithCategory, hostname: string): string {
  return `"${site.name}"(${hostname})`;
}

export function buildEmailDrafts(site: SiteWithCategory): EmailDraft[] {
  const hostname = decodeHostnameForDisplay(new URL(site.url).hostname);
  const sitePage = `${SITE_URL}/site/${site.slug}`;
  const badgePage = `${SITE_URL}/badge/${site.slug}`;
  const who = siteLine(site, hostname);
  const whoSubject = `${who}${josa(site.name, '이', '가')}`;
  const whoObject = `${who}${josa(site.name, '을', '를')}`;

  const approveUnverified: EmailDraft = {
    key: 'approve_unverified',
    label: '승인 (미인증)',
    hint: '승인했지만 소유권 인증은 아직인 경우. 인증 링크와 배지 안내를 함께 보낸다.',
    subject: `[${SITE_NAME}] "${site.name}" 등록이 승인되었습니다`,
    body: `${GREETING}

등록해 주신 ${whoSubject} 검토를 거쳐 디렉토리에 등록되었습니다.

▶ 등록 페이지
${sitePage}

■ 소유권 인증을 하시면 인증 배지를 드립니다

아직 소유권 인증은 되어 있지 않습니다. 인증은 선택 사항이며, 하지 않아도 등록은 그대로 유지됩니다.

인증을 마치면
- 상세 페이지에 "소유권 인증됨" 표시가 붙고
- 목록에서 사이트명 옆에 인증 마크가 표시되며
- 홈페이지에 붙일 수 있는 인증 배지를 무료로 드립니다. 상호 링크 같은 조건은 없습니다.

${verificationLinkBlock(site)}

${verificationSteps(site, hostname)}

등록 정보에 수정이 필요하거나 등록을 내리고 싶으시면 이 메일에 답장해 주세요.

${SIGNATURE}`,
  };

  const approveVerified: EmailDraft = {
    key: 'approve_verified',
    label: '승인 (인증됨)',
    hint: '소유권 인증까지 끝난 사이트를 승인한 경우. 배지 페이지를 안내한다.',
    subject: `[${SITE_NAME}] "${site.name}" 등록이 승인되었습니다 (소유권 인증 완료)`,
    body: `${GREETING}

등록해 주신 ${whoSubject} 검토를 거쳐 디렉토리에 등록되었습니다. 소유권 인증도 완료되어 상세 페이지에 "소유권 인증됨" 표시가 붙었습니다.

▶ 등록 페이지
${sitePage}

■ 인증 배지를 받아 가세요

인증을 마친 사이트에는 홈페이지에 붙일 수 있는 인증 배지를 드립니다.

▶ 배지 받기
${badgePage}

- 기본·컴팩트·씰 세 가지 스타일, 라이트·다크 두 가지 테마가 있습니다.
- 이미지 태그 방식과 인라인 SVG 방식 중 편한 코드를 복사해 홈페이지에 붙이면 됩니다.
- 방문자가 배지를 누르면 ${SITE_NAME}의 등록 정보 페이지로 이동해, 어떤 근거로 붙은 표식인지 확인할 수 있습니다.
- 배지는 무료이고 상호 링크 조건도 없습니다. 내리셔도 등록과 인증 상태는 유지됩니다.

등록 정보에 수정이 필요하거나 등록을 내리고 싶으시면 이 메일에 답장해 주세요.

${SIGNATURE}`,
  };

  const approveThirdParty: EmailDraft = {
    key: 'approve_third_party',
    label: '승인 (제3자 제보)',
    hint: '"제가 운영하는 사이트가 아닙니다"로 제출된 건을 승인한 경우. 제보자에게는 인증 링크를 보내지 않는다.',
    subject: `[${SITE_NAME}] 제보해 주신 "${site.name}"${josa(site.name, '이', '가')} 등록되었습니다`,
    body: `${GREETING}

제보해 주신 ${whoSubject} 검토를 거쳐 디렉토리에 등록되었습니다. 좋은 사이트를 알려주셔서 감사합니다.

▶ 등록 페이지
${sitePage}

운영자가 아닌 분의 제보로 접수된 건이라 소유권 인증과 인증 배지는 해당되지 않습니다. 혹시 이 사이트의 운영자와 연락이 닿으시면 ${CONTACT_EMAIL} 로 알려주시라고 전해 주세요. 인증 링크를 보내드리겠습니다.

${SIGNATURE}`,
  };

  const reject: EmailDraft = {
    key: 'reject',
    label: '거절',
    hint: '아래에서 사유를 고르면 본문이 채워진다. 여러 개를 고를 수 있고 직접 적을 수도 있다.',
    subject: `[${SITE_NAME}] "${site.name}" 등록을 진행하지 못했습니다`,
    body: '',
  };

  const requestInfo: EmailDraft = {
    key: 'request_info',
    label: '보완 요청',
    hint: '거절하기엔 아깝지만 그대로 승인하기엔 정보가 부족할 때. 대기 상태로 둔 채 보낸다. 대괄호 부분을 채워서 보낼 것.',
    subject: `[${SITE_NAME}] "${site.name}" 등록 검토를 위해 확인이 필요합니다`,
    body: `${GREETING}

등록해 주신 ${whoObject} 검토하던 중 확인이 필요한 부분이 있어 연락드립니다.

▶ 확인이 필요한 내용
[여기에 무엇을 확인해야 하는지 적어주세요. 예: 상세 설명이 한 줄뿐이라 어떤 서비스인지 알기 어렵습니다. 하는 일과 이용 대상을 조금 더 적어주시겠어요?]

이 메일에 답장으로 알려주시면 바로 검토를 이어가겠습니다. 등록 폼에서 바뀐 정보로 다시 등록해 주셔도 됩니다.
${SITE_URL}/submit

${SIGNATURE}`,
  };

  const verifyLink: EmailDraft = {
    key: 'verify_link',
    label: '인증 링크 안내',
    hint: '이미 등록된 사이트의 운영자가 문의로 인증을 요청한 경우. 상대가 정말 운영자인지 먼저 확인할 것.',
    subject: `[${SITE_NAME}] "${site.name}" 소유권 인증 링크입니다`,
    body: `${GREETING}

요청하신 ${who}의 소유권 인증 링크를 보내드립니다.

${verificationLinkBlock(site)}

${verificationSteps(site, hostname)}

인증을 마치면 상세 페이지에 "소유권 인증됨" 표시가 붙고, 인증 페이지에서 홈페이지에 붙일 인증 배지를 바로 받아 가실 수 있습니다. 배지는 무료이고 상호 링크 조건도 없습니다.

▶ 등록 페이지
${sitePage}

${SIGNATURE}`,
  };

  return [approveUnverified, approveVerified, approveThirdParty, reject, requestInfo, verifyLink];
}

/** 거절 메일의 앞뒤 고정 문단. 사유는 이 사이에 들어간다. */
export function rejectSkeleton(site: SiteWithCategory): { intro: string; outro: string } {
  const hostname = decodeHostnameForDisplay(new URL(site.url).hostname);
  return {
    intro: `${GREETING}

등록해 주신 ${siteLine(site, hostname)}${josa(site.name, '을', '를')} 검토했으나, 아래 사유로 이번에는 등록을 진행하지 못했습니다.`,
    outro: `사유가 해소되면 언제든 다시 등록하실 수 있습니다.
${SITE_URL}/submit

판단에 이견이 있으시거나 보충 설명이 필요하시면 이 메일에 답장으로 알려주세요.

${SIGNATURE}`,
  };
}

/** 사이트 상태를 보고 처음에 보여줄 문안을 고른다. */
export function defaultTemplateFor(site: SiteWithCategory): EmailTemplateKey {
  if (site.status === 'rejected') return 'reject';
  if (site.status === 'pending') return 'request_info';
  if (site.third_party_submission) return 'approve_third_party';
  return site.ownership_verified ? 'approve_verified' : 'approve_unverified';
}
