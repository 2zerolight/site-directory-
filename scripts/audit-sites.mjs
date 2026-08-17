#!/usr/bin/env node
// Content-level audit: HTTP 200 alone doesn't mean a site is alive — parked
// domains, "for sale" landers, and dead services often still return 200 with
// a tiny stub page. This fetches the actual body and flags known parking
// signatures or suspiciously short/empty responses for manual review.
//
// Usage: node scripts/audit-sites.mjs --file=/path/to/all-sites.json

import { readFileSync } from 'node:fs';

const PARKING_SIGNATURES = [
  'domain is parked',
  'domain for sale',
  'buy this domain',
  'this domain may be for sale',
  'parking-lander',
  'ap:"parking"',
  'sedo.com',
  'sedoparking',
  'afternic',
  'hugedomains',
  'godaddy.com/domain',
  'bodis.com',
  'dan.com',
  'namebright',
  '도메인이 만료',
  '도메인 판매',
  '이 도메인은 등록되지 않았습니다',
];

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

async function auditOne(site) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(site.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36' },
    });
    clearTimeout(timeoutId);
    const text = await res.text();
    const lower = text.toLowerCase();

    const matchedSignature = PARKING_SIGNATURES.find((sig) => lower.includes(sig.toLowerCase()));
    const tooShort = text.length < 300;
    const hasJsOnlyRedirect = /window\.location\.href\s*=\s*["']\/?lander/i.test(text);

    return {
      ...site,
      httpStatus: res.status,
      finalUrl: res.url,
      bodyLength: text.length,
      flag: matchedSignature ? `parking:${matchedSignature}` : hasJsOnlyRedirect ? 'js-redirect-stub' : tooShort ? 'too-short' : null,
    };
  } catch (err) {
    return { ...site, httpStatus: null, finalUrl: null, bodyLength: 0, flag: `fetch-error:${err.message}` };
  }
}

async function main() {
  const fileArg = process.argv.slice(2).find((a) => a.startsWith('--file='));
  if (!fileArg) {
    console.error('Usage: node scripts/audit-sites.mjs --file=/path/to/all-sites.json');
    process.exit(1);
  }
  const sites = JSON.parse(readFileSync(fileArg.slice('--file='.length), 'utf-8'));
  console.log(`Auditing ${sites.length} sites...`);

  const results = await mapWithConcurrency(sites, 8, auditOne);
  const flagged = results.filter((r) => r.flag);

  console.log(`\n${flagged.length} flagged out of ${sites.length}:\n`);
  for (const r of flagged) {
    console.log(`[${r.flag}] ${r.name} | ${r.url} | status=${r.httpStatus} | bodyLen=${r.bodyLength} | finalUrl=${r.finalUrl}`);
  }

  console.log('\nAll clear (no flag):', results.length - flagged.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
