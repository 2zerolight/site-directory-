import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { searchSiteSuggestions } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return new Response(JSON.stringify({ suggestions: [] }), { headers: { 'Content-Type': 'application/json' } });
  }

  const suggestions = await searchSiteSuggestions(env.DB, q, 6);
  return new Response(JSON.stringify({ suggestions }), { headers: { 'Content-Type': 'application/json' } });
};
