import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAllApprovedSlugsAndCategorySlugs } from '../lib/db';
import { SITE_URL } from '../lib/site';

export const GET: APIRoute = async () => {
  const { siteSlugs, categorySlugs } = await getAllApprovedSlugsAndCategorySlugs(env.DB);

  const staticUrls = ['/', '/search', '/submit'];
  const categoryUrls = categorySlugs.map((slug) => `/category/${slug}`);
  const siteUrls = siteSlugs.map((slug) => `/site/${slug}`);
  const allUrls = [...staticUrls, ...categoryUrls, ...siteUrls];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((path) => `  <url><loc>${new URL(path, SITE_URL).toString()}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
