import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSiteBySlug, incrementClickCount } from '../../lib/db';
import { ADMIN_COOKIE_NAME, isValidSessionCookieValue } from '../../lib/auth';

export const GET: APIRoute = async ({ params, redirect, cookies }) => {
  const site = params.slug ? await getSiteBySlug(env.DB, params.slug) : null;

  if (!site) {
    return redirect('/404');
  }

  if (site.status !== 'approved') {
    const isAdmin = await isValidSessionCookieValue(env.ADMIN_PASSWORD, cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (!isAdmin) return redirect('/404');
    return redirect(site.url, 302);
  }

  await incrementClickCount(env.DB, site.id);
  return redirect(site.url, 302);
};
