#!/usr/bin/env node
// Batch version of admin-add-site.mjs: takes a JSON array of hand-curated site
// records, health-checks each URL concurrently, and inserts them all in a
// single wrangler d1 execute call (much faster than one process per site).
//
// Usage:
//   node scripts/admin-add-sites-batch.mjs --file=/path/to/sites.json [--remote]

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

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function buildInsert(record, slug, httpStatus, isHttps) {
  return `INSERT INTO sites (
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
);`;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='));
  const remote = args.includes('--remote');

  if (!fileArg) {
    console.error('Usage: node scripts/admin-add-sites-batch.mjs --file=/path/to/sites.json [--remote]');
    process.exit(1);
  }

  const records = JSON.parse(readFileSync(fileArg.slice('--file='.length), 'utf-8'));
  if (!Array.isArray(records) || records.length === 0) {
    console.error('Input file must contain a non-empty JSON array.');
    process.exit(1);
  }

  for (const [i, record] of records.entries()) {
    for (const required of ['name', 'url', 'tagline', 'description', 'categoryId']) {
      if (!record[required]) {
        console.error(`Record #${i} missing required field: ${required}`);
        process.exit(1);
      }
    }
  }

  console.log(`Checking ${records.length} URLs...`);
  const checks = await mapWithConcurrency(records, 6, async (record) => {
    const { httpStatus, isHttps } = await checkHealth(record.url);
    return { record, slug: slugify(record.name), httpStatus, isHttps };
  });

  const sql = checks.map(({ record, slug, httpStatus, isHttps }) => buildInsert(record, slug, httpStatus, isHttps)).join('\n');

  const tmpDir = mkdtempSync(path.join(tmpdir(), 'admin-add-sites-batch-'));
  const sqlPath = path.join(tmpDir, 'insert.sql');
  writeFileSync(sqlPath, sql, 'utf-8');

  const projectRoot = path.resolve(import.meta.dirname, '..');
  const wranglerArgs = ['wrangler', 'd1', 'execute', 'site-directory-db', remote ? '--remote' : '--local', `--file=${sqlPath}`];
  execFileSync('npx', wranglerArgs, { cwd: projectRoot, stdio: 'inherit' });

  console.log('\nResults:');
  for (const { record, slug, httpStatus, isHttps } of checks) {
    const flag = httpStatus && httpStatus >= 200 && httpStatus < 400 ? 'OK' : 'CHECK';
    console.log(`[${flag}] ${record.name} -> /site/${slug} (status=${httpStatus}, https=${Boolean(isHttps)})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
