import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAllSitesForExport } from '../../lib/db';
import { ADMIN_COOKIE_NAME, isValidSessionCookieValue } from '../../lib/auth';

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const COLUMNS: [string, (site: Awaited<ReturnType<typeof getAllSitesForExport>>[number]) => unknown][] = [
  ['id', (s) => s.id],
  ['name', (s) => s.name],
  ['url', (s) => s.url],
  ['status', (s) => s.status],
  ['category', (s) => s.category_name],
  ['subcategory', (s) => s.subcategory_name],
  ['tagline', (s) => s.tagline],
  ['region', (s) => s.region],
  ['site_type', (s) => s.site_type],
  ['ownership_verified', (s) => s.ownership_verified],
  ['view_count', (s) => s.view_count],
  ['click_count', (s) => s.click_count],
  ['helpful_count', (s) => s.helpful_count],
  ['created_at', (s) => s.created_at],
  ['approved_at', (s) => s.approved_at],
];

export const GET: APIRoute = async ({ cookies }) => {
  const isAuthed = await isValidSessionCookieValue(env.ADMIN_PASSWORD, cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!isAuthed) {
    return new Response('Forbidden', { status: 403 });
  }

  const sites = await getAllSitesForExport(env.DB);

  const header = COLUMNS.map(([name]) => name).join(',');
  const rows = sites.map((site) => COLUMNS.map(([, getter]) => csvEscape(getter(site))).join(','));
  const csv = '﻿' + [header, ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="siteda-sites-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
};
