import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSitemapData } from '../lib/db';
import { SITE_URL } from '../lib/site';
import { getCollection } from 'astro:content';

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
  const guides = await getCollection('guides', ({ data }) => !data.draft);

  // /search 는 페이지 자체가 noindex 이므로 사이트맵에 넣지 않는다.
  // (색인해달라고 제출해놓고 페이지에서 색인하지 말라고 하면 사이트맵 신뢰도가 깎인다)
  const staticEntries = ['/', '/about', '/guides', '/submit', '/faq', '/updates', '/contact', '/privacy', '/terms'].map(
    (path) => urlEntry(path, null)
  );
  const guideEntries = guides.map((g) =>
    urlEntry(`/guides/${g.id}`, (g.data.updatedDate ?? g.data.publishDate).toISOString().slice(0, 19) + 'Z')
  );
  const categoryEntries = categories.map((c) => urlEntry(`/category/${c.slug}`, toLastmod(c.last_update)));
  const tagEntries = tags.map((t) => urlEntry(`/tag/${t.slug}`, toLastmod(t.last_update)));
  const siteEntries = sites.map((s) => urlEntry(`/site/${s.slug}`, toLastmod(s.updated_at)));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...guideEntries, ...categoryEntries, ...tagEntries, ...siteEntries].join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
