import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSiteBySlug, incrementClickCount } from '../../lib/db';

export const GET: APIRoute = async ({ params, redirect }) => {
  const site = params.slug ? await getSiteBySlug(env.DB, params.slug) : null;

  if (!site || site.status !== 'approved') {
    return redirect('/404');
  }

  await incrementClickCount(env.DB, site.id);
  return redirect(site.url, 302);
};
