import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /go/

Sitemap: ${new URL('/sitemap.xml', SITE_URL).toString()}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
