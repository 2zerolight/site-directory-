import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSitesByIds } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const idsParam = url.searchParams.get('ids') ?? '';
  const ids = idsParam
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 100);

  if (ids.length === 0) {
    return new Response(JSON.stringify({ sites: [] }), { headers: { 'Content-Type': 'application/json' } });
  }

  const sites = await getSitesByIds(env.DB, ids);
  const bySlug = sites.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    tagline: s.tagline,
    logo_url: s.logo_url,
    url: s.url,
    category_name: s.category_name,
  }));

  return new Response(JSON.stringify({ sites: bySlug }), { headers: { 'Content-Type': 'application/json' } });
};
