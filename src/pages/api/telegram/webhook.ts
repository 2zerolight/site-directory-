import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSiteById, setSiteStatus, checkSiteHealth } from '../../../lib/db';
import {
  readTelegramConfig,
  answerCallback,
  markHandled,
  formatKst,
  escapeTelegramHtml,
} from '../../../lib/telegram';

/**
 * 텔레그램 메시지의 승인/거절 버튼을 처리한다.
 *
 * 이 엔드포인트는 공개되어 있으므로 누가 요청을 보냈는지 반드시 확인해야 한다.
 * 확인은 두 겹이다.
 *
 *   1. setWebhook 에 등록한 secret_token 이 X-Telegram-Bot-Api-Secret-Token
 *      헤더로 되돌아오는지 — 텔레그램이 보낸 요청인지 가린다.
 *   2. 버튼을 누른 사람이 TELEGRAM_CHAT_ID 본인인지 — 봇을 알아낸 제3자가
 *      대화를 걸어 버튼을 만들어 누르는 경우를 막는다.
 *
 * 둘 중 하나라도 어긋나면 아무 일도 하지 않고 200 을 반환한다. 텔레그램은
 * 200 이 아니면 같은 업데이트를 계속 재전송하므로, 거부할 때도 200 이어야
 * 재시도 폭주를 피할 수 있다.
 */
export const prerender = false;

const OK = () => new Response('ok', { status: 200 });

interface CallbackQuery {
  id: string;
  from?: { id?: number };
  data?: string;
  message?: {
    message_id?: number;
    chat?: { id?: number };
    text?: string;
  };
}

export const POST: APIRoute = async ({ request }) => {
  const config = readTelegramConfig(env);
  if (!config) return OK();

  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== config.webhookSecret) {
    return OK();
  }

  let update: { callback_query?: CallbackQuery };
  try {
    update = await request.json();
  } catch {
    return OK();
  }

  const cq = update.callback_query;
  if (!cq?.id) return OK();

  if (String(cq.from?.id ?? '') !== config.chatId) {
    await answerCallback(config, cq.id, '권한이 없습니다.');
    return OK();
  }

  const [action, rawId] = String(cq.data ?? '').split(':');
  const siteId = Number(rawId);
  if ((action !== 'approve' && action !== 'reject') || !Number.isInteger(siteId) || siteId <= 0) {
    return OK();
  }

  const site = await getSiteById(env.DB, siteId);
  if (!site) {
    await answerCallback(config, cq.id, '사이트를 찾을 수 없습니다.');
    return OK();
  }

  // 이미 처리한 건을 다시 누른 경우. 상태를 덮어쓰지 않고 현재 상태만 알린다.
  if (site.status !== 'pending') {
    const label = site.status === 'approved' ? '승인' : '거절';
    await answerCallback(config, cq.id, `이미 ${label} 처리된 사이트입니다.`);
    return OK();
  }

  let resultLine: string;
  if (action === 'approve') {
    // 관리자 화면의 승인과 같은 절차를 밟는다 — 승인 시점에 접속 상태를 함께 기록한다.
    await checkSiteHealth(env.DB, site.id, site.url);
    await setSiteStatus(env.DB, site.id, 'approved');
    resultLine = `✅ <b>승인됨</b> · ${escapeTelegramHtml(formatKst())}`;
  } else {
    await setSiteStatus(env.DB, site.id, 'rejected');
    resultLine = `❌ <b>거절됨</b> · ${escapeTelegramHtml(formatKst())}`;
  }

  await answerCallback(config, cq.id, action === 'approve' ? '승인했습니다.' : '거절했습니다.');

  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  if (chatId && messageId) {
    // 원문은 HTML 파스 결과라 태그가 벗겨진 평문으로 돌아온다. 그대로 다시 넣으면
    // 굵게/기울임이 사라지므로 이스케이프해 안전한 평문으로 재구성한다.
    await markHandled(config, chatId, messageId, escapeTelegramHtml(cq.message?.text ?? ''), resultLine);
  }

  return OK();
};

/** 잘못된 메서드로 들어오는 요청은 조용히 넘긴다. */
export const GET: APIRoute = () => new Response('telegram webhook', { status: 200 });
