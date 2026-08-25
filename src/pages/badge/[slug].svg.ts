import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSiteBySlug } from '../../lib/db';
import { decodeHostnameForDisplay } from '../../lib/urls';
import { badgeAltText, parseBadgeStyle, parseBadgeTheme, renderBadgeSvg } from '../../lib/badge';

export const GET: APIRoute = async ({ params, url }) => {
  const site = params.slug ? await getSiteBySlug(env.DB, params.slug) : null;

  // The badge is a public trust signal, so it only exists for listings that are
  // actually live in the directory.
  if (!site || site.status !== 'approved') {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const verified = site.ownership_verified === 1;
  const svg = renderBadgeSvg(
    {
      hostname: decodeHostnameForDisplay(new URL(site.url).hostname),
      verified,
      style: parseBadgeStyle(url.searchParams.get('style')),
      theme: parseBadgeTheme(url.searchParams.get('theme')),
    },
    badgeAltText(site.name, verified)
  );

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Robots-Tag': 'noindex',
    },
  });
};
