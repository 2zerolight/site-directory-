import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSitemapData } from '../lib/db';
import { SITE_URL } from '../lib/site';

function toLastmod(value: string | null): string | null {
  if (!value) return null;
  return `${value.replace(' ', 'T')}Z`;
}

function urlEntry(path: string, lastmod: string | null): string {
  const loc = new URL(path, SITE_URL).toString();
  return lastmod ? `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>` : `  <url><loc>${loc}</loc></url>`;
}

export const GET: APIRoute = async () => {
  const { sites, categories, tags } = await getSitemapData(env.DB);

  const staticEntries = ['/', '/search', '/submit'].map((path) => urlEntry(path, null));
  const categoryEntries = categories.map((c) => urlEntry(`/category/${c.slug}`, toLastmod(c.last_update)));
  const tagEntries = tags.map((t) => urlEntry(`/tag/${t.slug}`, toLastmod(t.last_update)));
  const siteEntries = sites.map((s) => urlEntry(`/site/${s.slug}`, toLastmod(s.updated_at)));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...categoryEntries, ...tagEntries, ...siteEntries].join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
