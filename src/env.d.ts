/// <reference types="astro/client" />

declare global {
  namespace Cloudflare {
    interface Env {
      ADMIN_PASSWORD: string;
      /** 셋 다 있어야 텔레그램 알림이 켜진다. 하나라도 없으면 기능만 꺼진다. */
      TELEGRAM_BOT_TOKEN?: string;
      TELEGRAM_CHAT_ID?: string;
      TELEGRAM_WEBHOOK_SECRET?: string;
    }
  }
}

export {};
