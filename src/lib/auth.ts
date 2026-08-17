// Stateless admin session: the cookie carries an expiry timestamp plus an
// HMAC signature over that timestamp, keyed by ADMIN_PASSWORD. No session
// table needed — anyone without the password can't forge a valid signature,
// and the timestamp bounds how long a stolen cookie stays useful.
export const ADMIN_COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createSessionCookieValue(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = await hmac(secret, `admin:${expiresAt}`);
  return `${expiresAt}.${signature}`;
}

export async function isValidSessionCookieValue(secret: string, value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expiresAtStr, signature] = value.split('.');
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || !signature || Date.now() > expiresAt) return false;
  const expected = await hmac(secret, `admin:${expiresAt}`);
  return expected === signature;
}
