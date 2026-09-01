import { SITE_URL } from './site';
import type { SiteWithCategory } from '../types';

/**
 * 사이트 등록 요청이 들어오면 텔레그램으로 알리고, 메시지에 붙은 버튼으로
 * 곧바로 승인/거절할 수 있게 한다.
 *
 * 필요한 환경 변수 셋:
 *   TELEGRAM_BOT_TOKEN      BotFather 가 발급한 토큰
 *   TELEGRAM_CHAT_ID        알림을 받을 대화 id (본인 계정 또는 그룹)
 *   TELEGRAM_WEBHOOK_SECRET 웹훅 진위 확인용 임의 문자열
 *
 * 셋 중 하나라도 없으면 알림 기능만 조용히 꺼진다. 등록 자체는 그대로 동작해야
 * 하기 때문이다. 알림이 실패했다고 제출을 막으면 손해가 더 크다.
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  webhookSecret: string;
}

export function readTelegramConfig(env: {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
}): TelegramConfig | null {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!botToken || !chatId || !webhookSecret) return null;
  return { botToken, chatId, webhookSecret };
}

const API = 'https://api.telegram.org/bot';
const TIMEOUT_MS = 5000;

async function call(botToken: string, method: string, body: unknown): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API}${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    // 텔레그램이 느리거나 죽어 있어도 호출한 쪽 흐름은 그대로 이어져야 한다.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** HTML 파스 모드에서 &, <, > 는 반드시 이스케이프해야 한다. */
function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function buildSubmissionMessage(site: {
  id: number;
  name: string;
  url: string;
  tagline: string;
  description: string;
  categoryName: string;
  subcategoryName: string | null;
  region: string | null;
  siteType: string | null;
  operatorName: string | null;
  submittedEmail: string | null;
  thirdPartySubmission: boolean;
}): string {
  const rows: string[] = [
    `<b>새 사이트 등록 요청</b>`,
    ``,
    `<b>${esc(site.name)}</b>`,
    `${esc(site.url)}`,
  ];

  if (site.tagline) rows.push(``, esc(truncate(site.tagline, 200)));
  if (site.description && site.description !== site.tagline) {
    rows.push(``, `<i>${esc(truncate(site.description, 400))}</i>`);
  }

  const meta: string[] = [];
  meta.push(`분류: ${esc(site.categoryName)}${site.subcategoryName ? ` › ${esc(site.subcategoryName)}` : ''}`);
  if (site.siteType) meta.push(`유형: ${esc(site.siteType)}`);
  if (site.region) meta.push(`지역: ${esc(site.region)}`);
  if (site.operatorName) meta.push(`운영: ${esc(site.operatorName)}`);
  meta.push(`제출자: ${site.submittedEmail ? esc(site.submittedEmail) : '(미입력)'}`);
  // 제3자 제출은 검토 기준이 달라지므로 눈에 띄게 표시한다.
  meta.push(site.thirdPartySubmission ? `⚠️ <b>제3자 제출</b>: 운영자 본인이 아님` : `본인 운영 사이트로 제출됨`);

  rows.push(``, meta.join('\n'));
  return rows.join('\n');
}

function keyboard(siteId: number) {
  return {
    inline_keyboard: [
      [
        { text: '✅ 승인', callback_data: `approve:${siteId}` },
        { text: '❌ 거절', callback_data: `reject:${siteId}` },
      ],
      [{ text: '🔎 관리자 화면에서 보기', url: new URL(`/dashboard?site=${siteId}`, SITE_URL).toString() }],
    ],
  };
}

export async function notifyNewSubmission(
  config: TelegramConfig,
  site: Parameters<typeof buildSubmissionMessage>[0]
): Promise<void> {
  await call(config.botToken, 'sendMessage', {
    chat_id: config.chatId,
    text: buildSubmissionMessage(site),
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: keyboard(site.id),
  });
}

/** 버튼을 누른 사람에게 뜨는 짧은 안내. 이걸 보내야 버튼의 로딩 표시가 멈춘다. */
export async function answerCallback(
  config: TelegramConfig,
  callbackQueryId: string,
  text: string
): Promise<void> {
  await call(config.botToken, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

/**
 * 처리 결과를 원래 메시지에 덧붙이고 버튼을 없앤다. 버튼이 남아 있으면 이미
 * 처리한 건을 다시 누르게 되고, 무엇을 처리했는지 나중에 알 수 없다.
 */
export async function markHandled(
  config: TelegramConfig,
  chatId: number | string,
  messageId: number,
  originalText: string,
  resultLine: string
): Promise<void> {
  await call(config.botToken, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: `${originalText}\n\n${resultLine}`,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });
}

export function formatKst(date = new Date()): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export { esc as escapeTelegramHtml };
