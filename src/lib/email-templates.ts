import type { SiteWithCategory } from '../types';
import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from './site';
import { VERIFICATION_META_NAME, VERIFICATION_TXT_SUBDOMAIN } from './constants';
import { decodeHostnameForDisplay } from './urls';
import { josa } from './seo';

/*
  관리자가 제출자에게 보내는 메일 문안.

  메일은 시스템이 보내지 않는다. 관리자가 지메일에서 직접 보내므로 여기서는 제목과
  본문만 만들고, /dashboard/email/[id] 페이지가 복사 버튼과 Gmail 작성 링크를 붙인다.

  본문은 블록 목록으로 적고 평문과 HTML 두 가지로 렌더링한다. 같은 내용을 두 번 쓰면
  하나만 고치는 사고가 나기 때문이다. HTML 은 지메일 작성창에 붙여넣었을 때 살아남는
  인라인 스타일만 쓴다. <style> 블록, 클래스, 외부 이미지는 지메일이 버리거나 받는
  쪽에서 막는다.

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

export type EmailBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'button'; label: string; url: string }
  | { type: 'callout'; title: string; lines: string[]; tone: 'amber' | 'slate' }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; items: { title: string; code: string[] }[] }
  | { type: 'placeholder'; text: string }
  | { type: 'signature' };

export interface EmailDraft {
  key: EmailTemplateKey;
  label: string;
  /** 어떤 상황에 쓰는 문안인지. 관리자 화면에만 보인다. */
  hint: string;
  subject: string;
  text: string;
  html: string;
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

/* ---------- 렌더러 ---------- */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 본문 안의 URL 을 링크로 바꾼다. 이미 이스케이프된 문자열을 받는다. */
function linkify(escaped: string): string {
  return escaped.replace(
    /https?:\/\/[^\s<]+/g,
    (url) => `<a href="${url}" style="color:#0f172a;text-decoration:underline;">${url}</a>`
  );
}

const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',Roboto,sans-serif;";
const MONO = "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;";
const P_STYLE = `margin:0 0 14px 0;${FONT}font-size:15px;line-height:1.7;color:#0f172a;`;

/** 목록 스타일. 거절 사유 목록은 관리자 화면(브라우저)에서 조립하므로 같은 값을 내보낸다. */
export const LIST_UL_STYLE = `margin:0 0 14px 0;padding-left:22px;${FONT}font-size:15px;line-height:1.7;color:#0f172a;`;
export const LIST_LI_STYLE = 'margin-bottom:6px;';

const CALLOUT_TONES = {
  amber: { bg: '#fffbeb', border: '#fde68a', title: '#92400e', text: '#78350f' },
  slate: { bg: '#f8fafc', border: '#e2e8f0', title: '#0f172a', text: '#334155' },
} as const;

function signatureText(): string {
  return `감사합니다.\n${SITE_NAME} 드림\n${SITE_URL}\n${CONTACT_EMAIL}`;
}

function signatureHtml(): string {
  return `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;${FONT}font-size:13px;line-height:1.7;color:#64748b;">
감사합니다.<br>
<strong style="color:#0f172a;">${SITE_NAME}</strong> 드림<br>
<a href="${SITE_URL}" style="color:#64748b;text-decoration:underline;">${SITE_URL}</a><br>
<a href="mailto:${CONTACT_EMAIL}" style="color:#64748b;text-decoration:underline;">${CONTACT_EMAIL}</a>
</div>`;
}

export function renderText(blocks: EmailBlock[]): string {
  const parts = blocks.map((b) => {
    switch (b.type) {
      case 'p':
        return b.text;
      case 'h':
        return `■ ${b.text}`;
      case 'button':
        return `▶ ${b.label}\n${b.url}`;
      case 'callout':
        return `▶ ${b.title}\n${b.lines.join('\n')}`;
      case 'list':
        return b.items.map((item) => `- ${item}`).join('\n');
      case 'steps':
        return b.items
          .map((item, i) => `${i + 1}. ${item.title}\n${item.code.map((line) => `   ${line}`).join('\n')}`)
          .join('\n\n');
      case 'placeholder':
        return `[${b.text}]`;
      case 'signature':
        return signatureText();
    }
  });
  return parts.join('\n\n');
}

export function renderBlocksHtml(blocks: EmailBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'p':
          return `<p style="${P_STYLE}">${linkify(escapeHtml(b.text))}</p>`;
        case 'h':
          return `<h2 style="margin:26px 0 10px 0;${FONT}font-size:16px;font-weight:700;line-height:1.4;color:#0f172a;">${escapeHtml(b.text)}</h2>`;
        case 'button':
          return `<p style="margin:6px 0 18px 0;">
<a href="${escapeHtml(b.url)}" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;${FONT}font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${escapeHtml(b.label)} →</a><br>
<a href="${escapeHtml(b.url)}" style="display:inline-block;margin-top:6px;${FONT}font-size:12px;color:#64748b;text-decoration:underline;">${escapeHtml(b.url)}</a>
</p>`;
        case 'callout': {
          const tone = CALLOUT_TONES[b.tone];
          const lines = b.lines.map((line) => linkify(escapeHtml(line))).join('<br>');
          return `<div style="margin:0 0 16px 0;padding:14px 16px;background:${tone.bg};border:1px solid ${tone.border};border-radius:8px;${FONT}font-size:14px;line-height:1.7;color:${tone.text};">
<div style="font-weight:700;color:${tone.title};margin-bottom:4px;">${escapeHtml(b.title)}</div>
<div style="word-break:break-all;">${lines}</div>
</div>`;
        }
        case 'list':
          return `<ul style="${LIST_UL_STYLE}">
${b.items.map((item) => `<li style="${LIST_LI_STYLE}">${linkify(escapeHtml(item))}</li>`).join('\n')}
</ul>`;
        case 'steps':
          return `<ol style="margin:0 0 14px 0;padding-left:22px;${FONT}font-size:15px;line-height:1.7;color:#0f172a;">
${b.items
  .map(
    (item) => `<li style="margin-bottom:12px;">${escapeHtml(item.title)}
<div style="margin-top:6px;padding:10px 12px;background:#f1f5f9;border-radius:6px;${MONO}font-size:12.5px;line-height:1.6;color:#334155;word-break:break-all;">${item.code.map((line) => escapeHtml(line)).join('<br>')}</div>
</li>`
  )
  .join('\n')}
</ol>`;
        case 'placeholder':
          return `<p style="${P_STYLE}padding:12px 14px;background:#fef2f2;border:1px dashed #fca5a5;border-radius:6px;color:#b91c1c;">[${escapeHtml(b.text)}]</p>`;
        case 'signature':
          return signatureHtml();
      }
    })
    .join('\n');
}

/** 메일 전체를 감싸는 틀. 상단 워드마크와 제목, 본문. */
export function wrapEmailHtml(heading: string, bodyHtml: string): string {
  return `<div style="max-width:600px;margin:0;padding:8px 0;${FONT}color:#0f172a;">
<div style="${FONT}font-size:13px;font-weight:700;letter-spacing:-0.01em;color:#64748b;margin-bottom:6px;">${escapeHtml(SITE_NAME)}</div>
<h1 style="margin:0 0 20px 0;${FONT}font-size:20px;font-weight:700;line-height:1.4;color:#0f172a;">${escapeHtml(heading)}</h1>
${bodyHtml}
</div>`;
}

/* ---------- 문안 ---------- */

const GREETING = `안녕하세요, ${SITE_NAME}입니다.`;

function verificationSteps(site: SiteWithCategory, hostname: string): EmailBlock[] {
  const token = site.verification_token ?? '';
  return [
    { type: 'p', text: '인증 방법은 두 가지 중 편한 쪽 하나면 됩니다.' },
    {
      type: 'steps',
      items: [
        { title: '홈페이지 <head> 에 메타태그 추가', code: [`<meta name="${VERIFICATION_META_NAME}" content="${token}" />`] },
        {
          title: '도메인 DNS 에 TXT 레코드 추가',
          code: [`호스트: ${VERIFICATION_TXT_SUBDOMAIN}.${hostname}`, '타입: TXT', `값: ${token}`],
        },
      ],
    },
    {
      type: 'p',
      text: '적용한 뒤 인증 페이지에서 "지금 확인" 버튼을 누르면 바로 인증됩니다. DNS 방식은 반영까지 몇 분에서 몇 시간 걸릴 수 있습니다.',
    },
  ];
}

function verificationLinkBlock(site: SiteWithCategory): EmailBlock {
  if (!site.verification_secret) {
    return {
      type: 'callout',
      tone: 'amber',
      title: '인증 페이지',
      lines: ['인증 링크가 아직 발급되지 않았습니다. 이 메일에 답장해 주시면 바로 보내드리겠습니다.'],
    };
  }
  return {
    type: 'callout',
    tone: 'amber',
    title: '인증 페이지 · 이 사이트 전용 주소입니다. 외부에 공유하지 마세요.',
    lines: [`${SITE_URL}/submit/verify/${site.verification_secret}`],
  };
}

interface DraftSpec {
  key: EmailTemplateKey;
  label: string;
  hint: string;
  subject: string;
  heading: string;
  blocks: EmailBlock[];
}

function finish(spec: DraftSpec): EmailDraft {
  return {
    key: spec.key,
    label: spec.label,
    hint: spec.hint,
    subject: spec.subject,
    text: renderText(spec.blocks),
    html: wrapEmailHtml(spec.heading, renderBlocksHtml(spec.blocks)),
  };
}

export function buildEmailDrafts(site: SiteWithCategory): EmailDraft[] {
  const hostname = decodeHostnameForDisplay(new URL(site.url).hostname);
  const sitePage = `${SITE_URL}/site/${site.slug}`;
  const badgePage = `${SITE_URL}/badge/${site.slug}`;
  const who = `"${site.name}"(${hostname})`;
  const whoSubject = `${who}${josa(site.name, '이', '가')}`;
  const whoObject = `${who}${josa(site.name, '을', '를')}`;
  const replyNote: EmailBlock = {
    type: 'p',
    text: '등록 정보에 수정이 필요하거나 등록을 내리고 싶으시면 이 메일에 답장해 주세요.',
  };

  const approveUnverified = finish({
    key: 'approve_unverified',
    label: '승인 (미인증)',
    hint: '승인했지만 소유권 인증은 아직인 경우. 인증 링크와 배지 안내를 함께 보낸다.',
    subject: `[${SITE_NAME}] "${site.name}" 등록이 승인되었습니다`,
    heading: `${site.name} 등록이 승인되었습니다`,
    blocks: [
      { type: 'p', text: GREETING },
      { type: 'p', text: `등록해 주신 ${whoSubject} 검토를 거쳐 디렉토리에 등록되었습니다.` },
      { type: 'button', label: '등록 페이지 보기', url: sitePage },
      { type: 'h', text: '소유권 인증을 하시면 인증 배지를 드립니다' },
      { type: 'p', text: '아직 소유권 인증은 되어 있지 않습니다. 인증은 선택 사항이며, 하지 않아도 등록은 그대로 유지됩니다. 인증을 마치면 다음이 달라집니다.' },
      {
        type: 'list',
        items: [
          '상세 페이지에 "소유권 인증됨" 표시가 붙습니다.',
          '목록에서 사이트명 옆에 인증 마크가 표시됩니다.',
          '홈페이지에 붙일 수 있는 인증 배지를 무료로 드립니다. 상호 링크 같은 조건은 없습니다.',
        ],
      },
      verificationLinkBlock(site),
      ...verificationSteps(site, hostname),
      replyNote,
      { type: 'signature' },
    ],
  });

  const approveVerified = finish({
    key: 'approve_verified',
    label: '승인 (인증됨)',
    hint: '소유권 인증까지 끝난 사이트를 승인한 경우. 배지 페이지를 안내한다.',
    subject: `[${SITE_NAME}] "${site.name}" 등록이 승인되었습니다 (소유권 인증 완료)`,
    heading: `${site.name} 등록이 승인되었습니다`,
    blocks: [
      { type: 'p', text: GREETING },
      {
        type: 'p',
        text: `등록해 주신 ${whoSubject} 검토를 거쳐 디렉토리에 등록되었습니다. 소유권 인증도 완료되어 상세 페이지에 "소유권 인증됨" 표시가 붙었습니다.`,
      },
      { type: 'button', label: '등록 페이지 보기', url: sitePage },
      { type: 'h', text: '인증 배지를 받아 가세요' },
      { type: 'p', text: '인증을 마친 사이트에는 홈페이지에 붙일 수 있는 인증 배지를 드립니다.' },
      { type: 'button', label: '인증 배지 받기', url: badgePage },
      {
        type: 'list',
        items: [
          '기본·컴팩트·씰 세 가지 스타일, 라이트·다크 두 가지 테마가 있습니다.',
          '이미지 태그 방식과 인라인 SVG 방식 중 편한 코드를 복사해 홈페이지에 붙이면 됩니다.',
          `방문자가 배지를 누르면 ${SITE_NAME}의 등록 정보 페이지로 이동해, 어떤 근거로 붙은 표식인지 확인할 수 있습니다.`,
          '배지는 무료이고 상호 링크 조건도 없습니다. 내리셔도 등록과 인증 상태는 유지됩니다.',
        ],
      },
      replyNote,
      { type: 'signature' },
    ],
  });

  const approveThirdParty = finish({
    key: 'approve_third_party',
    label: '승인 (제3자 제보)',
    hint: '"제가 운영하는 사이트가 아닙니다"로 제출된 건을 승인한 경우. 제보자에게는 인증 링크를 보내지 않는다.',
    subject: `[${SITE_NAME}] 제보해 주신 "${site.name}"${josa(site.name, '이', '가')} 등록되었습니다`,
    heading: `제보해 주신 ${site.name}${josa(site.name, '이', '가')} 등록되었습니다`,
    blocks: [
      { type: 'p', text: GREETING },
      { type: 'p', text: `제보해 주신 ${whoSubject} 검토를 거쳐 디렉토리에 등록되었습니다. 좋은 사이트를 알려주셔서 감사합니다.` },
      { type: 'button', label: '등록 페이지 보기', url: sitePage },
      {
        type: 'p',
        text: `운영자가 아닌 분의 제보로 접수된 건이라 소유권 인증과 인증 배지는 해당되지 않습니다. 혹시 이 사이트의 운영자와 연락이 닿으시면 ${CONTACT_EMAIL} 로 알려주시라고 전해 주세요. 인증 링크를 보내드리겠습니다.`,
      },
      { type: 'signature' },
    ],
  });

  const reject: EmailDraft = {
    key: 'reject',
    label: '거절',
    hint: '아래에서 사유를 고르면 본문이 채워진다. 여러 개를 고를 수 있고 직접 적을 수도 있다.',
    subject: `[${SITE_NAME}] "${site.name}" 등록을 진행하지 못했습니다`,
    text: '',
    html: '',
  };

  const requestInfo = finish({
    key: 'request_info',
    label: '보완 요청',
    hint: '거절하기엔 아깝지만 그대로 승인하기엔 정보가 부족할 때. 대기 상태로 둔 채 보낸다. 빨간 대괄호 부분을 채워서 보낼 것.',
    subject: `[${SITE_NAME}] "${site.name}" 등록 검토를 위해 확인이 필요합니다`,
    heading: `${site.name} 등록 검토를 위해 확인이 필요합니다`,
    blocks: [
      { type: 'p', text: GREETING },
      { type: 'p', text: `등록해 주신 ${whoObject} 검토하던 중 확인이 필요한 부분이 있어 연락드립니다.` },
      { type: 'h', text: '확인이 필요한 내용' },
      {
        type: 'placeholder',
        text: '여기에 무엇을 확인해야 하는지 적어주세요. 예: 상세 설명이 한 줄뿐이라 어떤 서비스인지 알기 어렵습니다. 하는 일과 이용 대상을 조금 더 적어주시겠어요?',
      },
      { type: 'p', text: '이 메일에 답장으로 알려주시면 바로 검토를 이어가겠습니다. 등록 폼에서 바뀐 정보로 다시 등록해 주셔도 됩니다.' },
      { type: 'button', label: '다시 등록하기', url: `${SITE_URL}/submit` },
      { type: 'signature' },
    ],
  });

  const verifyLink = finish({
    key: 'verify_link',
    label: '인증 링크 안내',
    hint: '이미 등록된 사이트의 운영자가 문의로 인증을 요청한 경우. 상대가 정말 운영자인지 먼저 확인할 것.',
    subject: `[${SITE_NAME}] "${site.name}" 소유권 인증 링크입니다`,
    heading: `${site.name} 소유권 인증 링크입니다`,
    blocks: [
      { type: 'p', text: GREETING },
      { type: 'p', text: `요청하신 ${who}의 소유권 인증 링크를 보내드립니다.` },
      verificationLinkBlock(site),
      ...verificationSteps(site, hostname),
      {
        type: 'p',
        text: '인증을 마치면 상세 페이지에 "소유권 인증됨" 표시가 붙고, 인증 페이지에서 홈페이지에 붙일 인증 배지를 바로 받아 가실 수 있습니다. 배지는 무료이고 상호 링크 조건도 없습니다.',
      },
      { type: 'button', label: '등록 페이지 보기', url: sitePage },
      { type: 'signature' },
    ],
  });

  return [approveUnverified, approveVerified, approveThirdParty, reject, requestInfo, verifyLink];
}

export interface RejectSkeleton {
  heading: string;
  /** 전체 틀. 관리자 화면이 {{BODY}} 자리에 조립한 본문을 넣는다. */
  htmlTemplate: string;
  introText: string;
  introHtml: string;
  outroText: string;
  outroHtml: string;
}

/** 거절 메일의 앞뒤 고정 부분. 사유 목록은 관리자 화면에서 골라 이 사이에 넣는다. */
export function rejectSkeleton(site: SiteWithCategory): RejectSkeleton {
  const hostname = decodeHostnameForDisplay(new URL(site.url).hostname);
  const intro: EmailBlock[] = [
    { type: 'p', text: GREETING },
    {
      type: 'p',
      text: `등록해 주신 "${site.name}"(${hostname})${josa(site.name, '을', '를')} 검토했으나, 아래 사유로 이번에는 등록을 진행하지 못했습니다.`,
    },
  ];
  const outro: EmailBlock[] = [
    { type: 'p', text: '사유가 해소되면 언제든 다시 등록하실 수 있습니다.' },
    { type: 'button', label: '다시 등록하기', url: `${SITE_URL}/submit` },
    { type: 'p', text: '판단에 이견이 있으시거나 보충 설명이 필요하시면 이 메일에 답장으로 알려주세요.' },
    { type: 'signature' },
  ];
  return {
    heading: `${site.name} 등록을 진행하지 못했습니다`,
    htmlTemplate: wrapEmailHtml(`${site.name} 등록을 진행하지 못했습니다`, '{{BODY}}'),
    introText: renderText(intro),
    introHtml: renderBlocksHtml(intro),
    outroText: renderText(outro),
    outroHtml: renderBlocksHtml(outro),
  };
}

/** 사이트 상태를 보고 처음에 보여줄 문안을 고른다. */
export function defaultTemplateFor(site: SiteWithCategory): EmailTemplateKey {
  if (site.status === 'rejected') return 'reject';
  if (site.status === 'pending') return 'request_info';
  if (site.third_party_submission) return 'approve_third_party';
  return site.ownership_verified ? 'approve_verified' : 'approve_unverified';
}
