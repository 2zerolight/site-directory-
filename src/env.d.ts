/// <reference types="astro/client" />

declare global {
  namespace Cloudflare {
    interface Env {
      ADMIN_PASSWORD: string;
      /** 셋 다 있어야 텔레그램 알림이 켜진다. 하나라도 없으면 기능만 꺼진다. */
      TELEGRAM_BOT_TOKEN?: string;
      TELEGRAM_CHAT_ID?: string;
      TELEGRAM_WEBHOOK_SECRET?: string;
      /** tool99 파비콘 API 키. 서버에서만 쓴다. 없으면 파비콘 선택 기능만 꺼진다. */
      FAVICON_API_KEY?: string;
      /** 테스트용으로 API 주소를 바꿀 때만 쓴다. 비워 두면 tool99 를 쓴다. */
      FAVICON_API_BASE?: string;
    }
  }
}

export {};
