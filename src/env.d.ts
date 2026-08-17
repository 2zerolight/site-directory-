/// <reference types="astro/client" />

declare global {
  namespace Cloudflare {
    interface Env {
      ADMIN_PASSWORD: string;
    }
  }
}

export {};
