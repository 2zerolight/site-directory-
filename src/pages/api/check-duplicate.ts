import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findSiteByUrlHost } from '../../lib/db';

export const GET: APIRoute = async ({ url: requestUrl }) => {
  const target = requestUrl.searchParams.get('url')?.trim() ?? '';

  let hostname: string;
  try {
    hostname = new URL(target).hostname;
  } catch {
    return new Response(JSON.stringify({ exists: false }), { headers: { 'Content-Type': 'application/json' } });
  }

  const existing = await findSiteByUrlHost(env.DB, hostname);

  if (!existing) {
    return new Response(JSON.stringify({ exists: false }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(
    JSON.stringify({
      exists: true,
      name: existing.name,
      slug: existing.slug,
      status: existing.status,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
