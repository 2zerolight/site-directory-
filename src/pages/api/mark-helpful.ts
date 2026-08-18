import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { incrementHelpfulCount } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  let siteId: number;
  try {
    const body = (await request.json()) as { siteId?: number };
    siteId = Number(body.siteId);
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!Number.isInteger(siteId) || siteId <= 0) {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const count = await incrementHelpfulCount(env.DB, siteId);
  if (count === null) {
    return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, count }), { headers: { 'Content-Type': 'application/json' } });
};
