#!/usr/bin/env node
// Admin-curated site registration: takes a JSON record (already researched and
// written by hand — this script does not scrape or guess content), runs a
// live HTTP check against the URL, and inserts it pre-approved into D1.
//
// Usage:
//   node scripts/admin-add-site.mjs --file=/path/to/site.json [--remote]
//
// JSON shape (all fields optional except name/url/tagline/description/categoryId):
// {
//   "name": "...", "url": "https://...", "tagline": "...", "description": "...",
//   "logoUrl": null, "coverImageUrl": null,
//   "categoryId": 1, "subcategoryId": null, "region": "전국", "siteType": "블로그",
//   "mainKeywords": "...", "serviceKeywords": "...",
//   "operatorName": null, "businessName": null, "serviceRegion": null,
//   "customerCenter": null, "contactEmail": null,
//   "blogUrl": null, "youtubeUrl": null, "instagramUrl": null, "facebookUrl": null, "otherSnsUrl": null
// }

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function slugify(input) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}

function esc(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function escNum(value) {
  return value === null || value === undefined ? 'NULL' : Number(value);
}

async function checkHealth(url) {
  let httpStatus = null;
  let isHttps = 0;
  try {
    isHttps = new URL(url).protocol === 'https:' ? 1 : 0;
  } catch {
    // leave isHttps at 0
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeoutId);
    httpStatus = res.status;
  } catch {
    httpStatus = null;
  }
  return { httpStatus, isHttps };
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='));
  const remote = args.includes('--remote');

  if (!fileArg) {
    console.error('Usage: node scripts/admin-add-site.mjs --file=/path/to/site.json [--remote]');
    process.exit(1);
  }

  const jsonPath = fileArg.slice('--file='.length);
  const record = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  for (const required of ['name', 'url', 'tagline', 'description', 'categoryId']) {
    if (!record[required]) {
      console.error(`Missing required field: ${required}`);
      process.exit(1);
    }
  }

  const slug = slugify(record.name);
  const { httpStatus, isHttps } = await checkHealth(record.url);

  const sql = `INSERT INTO sites (
  slug, name, url, tagline, description, logo_url, cover_image_url,
  category_id, subcategory_id, region, site_type, platform,
  main_keywords, service_keywords,
  operator_name, business_name, service_region, customer_center, contact_email,
  blog_url, youtube_url, instagram_url, facebook_url, other_sns_url,
  http_status, is_https, ownership_verified, verification_method, last_checked_at, verified_at,
  status, submitted_email, view_count, click_count, created_at, updated_at, approved_at
) VALUES (
  ${esc(slug)}, ${esc(record.name)}, ${esc(record.url)}, ${esc(record.tagline)}, ${esc(record.description)}, ${esc(record.logoUrl)}, ${esc(record.coverImageUrl)},
  ${escNum(record.categoryId)}, ${escNum(record.subcategoryId)}, ${esc(record.region)}, ${esc(record.siteType)}, ${esc(record.platform)},
  ${esc(record.mainKeywords)}, ${esc(record.serviceKeywords)},
  ${esc(record.operatorName)}, ${esc(record.businessName)}, ${esc(record.serviceRegion)}, ${esc(record.customerCenter)}, ${esc(record.contactEmail)},
  ${esc(record.blogUrl)}, ${esc(record.youtubeUrl)}, ${esc(record.instagramUrl)}, ${esc(record.facebookUrl)}, ${esc(record.otherSnsUrl)},
  ${escNum(httpStatus)}, ${isHttps}, 1, NULL, datetime('now'), datetime('now'),
  'approved', NULL, 0, 0, datetime('now'), datetime('now'), datetime('now')
);
SELECT slug, name, http_status, is_https FROM sites WHERE slug = ${esc(slug)};`;

  const tmpDir = mkdtempSync(path.join(tmpdir(), 'admin-add-site-'));
  const sqlPath = path.join(tmpDir, 'insert.sql');
  writeFileSync(sqlPath, sql, 'utf-8');

  const projectRoot = path.resolve(import.meta.dirname, '..');
  const wranglerArgs = [
    'wrangler', 'd1', 'execute', 'site-directory-db',
    remote ? '--remote' : '--local',
    `--file=${sqlPath}`,
    '--json',
  ];

  const output = execFileSync('npx', wranglerArgs, { cwd: projectRoot, encoding: 'utf-8' });
  console.log(output);
  console.log(`Registered: /site/${slug} (http_status=${httpStatus}, https=${Boolean(isHttps)})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
