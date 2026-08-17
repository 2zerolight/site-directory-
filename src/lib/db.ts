import type { Category, CategoryWithCount, Site, SiteWithCategory, Subcategory } from '../types';

const PAGE_SIZE = 24;
export { PAGE_SIZE };

const SITE_WITH_CATEGORY_SELECT = `
  s.*,
  c.name AS category_name,
  c.slug AS category_slug,
  sc.name AS subcategory_name,
  sc.slug AS subcategory_slug
`;

const SITE_WITH_CATEGORY_JOIN = `
  FROM sites s
  JOIN categories c ON c.id = s.category_id
  LEFT JOIN subcategories sc ON sc.id = s.subcategory_id
`;

export async function getCategories(db: D1Database): Promise<Category[]> {
  const { results } = await db
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC')
    .all<Category>();
  return results;
}

export async function getCategoriesWithCounts(db: D1Database): Promise<CategoryWithCount[]> {
  const { results } = await db
    .prepare(
      `SELECT c.*, COUNT(s.id) AS site_count
       FROM categories c
       LEFT JOIN sites s ON s.category_id = c.id AND s.status = 'approved'
       GROUP BY c.id
       ORDER BY c.sort_order ASC`
    )
    .all<CategoryWithCount>();
  return results;
}

export async function getCategoryBySlug(db: D1Database, slug: string): Promise<Category | null> {
  const row = await db
    .prepare('SELECT * FROM categories WHERE slug = ?')
    .bind(slug)
    .first<Category>();
  return row ?? null;
}

export async function getAllSubcategories(db: D1Database): Promise<Subcategory[]> {
  const { results } = await db
    .prepare('SELECT * FROM subcategories ORDER BY category_id ASC, sort_order ASC')
    .all<Subcategory>();
  return results;
}

export async function getSubcategoriesByCategory(db: D1Database, categoryId: number): Promise<Subcategory[]> {
  const { results } = await db
    .prepare('SELECT * FROM subcategories WHERE category_id = ? ORDER BY sort_order ASC')
    .bind(categoryId)
    .all<Subcategory>();
  return results;
}

export async function getPlatformsInCategory(db: D1Database, categoryId: number): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT platform FROM sites
       WHERE category_id = ? AND status = 'approved' AND platform IS NOT NULL
       ORDER BY platform ASC`
    )
    .bind(categoryId)
    .all<{ platform: string }>();
  return results.map((r) => r.platform);
}

export async function getSubcategoryBySlug(
  db: D1Database,
  categoryId: number,
  slug: string
): Promise<Subcategory | null> {
  const row = await db
    .prepare('SELECT * FROM subcategories WHERE category_id = ? AND slug = ?')
    .bind(categoryId, slug)
    .first<Subcategory>();
  return row ?? null;
}

export async function getApprovedSitesByCategory(
  db: D1Database,
  categoryId: number,
  page: number,
  subcategoryId?: number,
  platform?: string
): Promise<{ sites: SiteWithCategory[]; total: number }> {
  const offset = (page - 1) * PAGE_SIZE;
  const subFilter = subcategoryId ? 'AND s.subcategory_id = ?' : '';
  const platformFilter = platform ? 'AND s.platform = ?' : '';
  const filterArgs = [
    ...(subcategoryId ? [subcategoryId] : []),
    ...(platform ? [platform] : []),
  ];
  const bindings = [categoryId, ...filterArgs, PAGE_SIZE, offset];
  const countBindings = [categoryId, ...filterArgs];

  const [listResult, countResult] = await Promise.all([
    db
      .prepare(
        `SELECT ${SITE_WITH_CATEGORY_SELECT}
         ${SITE_WITH_CATEGORY_JOIN}
         WHERE s.category_id = ? ${subFilter} ${platformFilter} AND s.status = 'approved'
         ORDER BY s.view_count DESC, s.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...bindings)
      .all<SiteWithCategory>(),
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM sites s WHERE s.category_id = ? ${subFilter} ${platformFilter} AND s.status = 'approved'`
      )
      .bind(...countBindings)
      .first<{ n: number }>(),
  ]);

  return { sites: listResult.results, total: countResult?.n ?? 0 };
}

export async function getSiteBySlug(db: D1Database, slug: string): Promise<SiteWithCategory | null> {
  const row = await db
    .prepare(`SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN} WHERE s.slug = ?`)
    .bind(slug)
    .first<SiteWithCategory>();
  return row ?? null;
}

export async function getRecentApprovedSites(db: D1Database, limit = 12): Promise<SiteWithCategory[]> {
  const { results } = await db
    .prepare(
      `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
       WHERE s.status = 'approved'
       ORDER BY s.created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<SiteWithCategory>();
  return results;
}

export async function getPopularApprovedSites(db: D1Database, limit = 8): Promise<SiteWithCategory[]> {
  const { results } = await db
    .prepare(
      `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
       WHERE s.status = 'approved'
       ORDER BY s.view_count DESC, s.created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<SiteWithCategory>();
  return results;
}

export async function getRelatedSites(
  db: D1Database,
  categoryId: number,
  excludeSiteId: number,
  limit = 6
): Promise<SiteWithCategory[]> {
  const { results } = await db
    .prepare(
      `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
       WHERE s.category_id = ? AND s.status = 'approved' AND s.id != ?
       ORDER BY s.created_at DESC
       LIMIT ?`
    )
    .bind(categoryId, excludeSiteId, limit)
    .all<SiteWithCategory>();
  return results;
}

export async function searchSites(db: D1Database, query: string, limit = 30): Promise<SiteWithCategory[]> {
  const like = `%${query}%`;
  const { results } = await db
    .prepare(
      `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
       WHERE s.status = 'approved'
         AND (s.name LIKE ? OR s.tagline LIKE ? OR s.description LIKE ? OR s.main_keywords LIKE ? OR s.service_keywords LIKE ?)
       ORDER BY s.view_count DESC
       LIMIT ?`
    )
    .bind(like, like, like, like, like, limit)
    .all<SiteWithCategory>();
  return results;
}

export async function getAllApprovedSlugsAndCategorySlugs(
  db: D1Database
): Promise<{ siteSlugs: string[]; categorySlugs: string[] }> {
  const [sites, categories] = await Promise.all([
    db.prepare(`SELECT slug FROM sites WHERE status = 'approved'`).all<{ slug: string }>(),
    db.prepare('SELECT slug FROM categories').all<{ slug: string }>(),
  ]);
  return {
    siteSlugs: sites.results.map((r) => r.slug),
    categorySlugs: categories.results.map((r) => r.slug),
  };
}

export async function getPendingSites(db: D1Database): Promise<SiteWithCategory[]> {
  const { results } = await db
    .prepare(
      `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
       WHERE s.status = 'pending'
       ORDER BY s.created_at ASC`
    )
    .all<SiteWithCategory>();
  return results;
}

export interface SiteSubmissionInput {
  slug: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  categoryId: number;
  subcategoryId: number | null;
  region: string | null;
  siteType: string | null;
  platform: string | null;
  mainKeywords: string | null;
  serviceKeywords: string | null;
  operatorName: string | null;
  businessName: string | null;
  serviceRegion: string | null;
  customerCenter: string | null;
  contactEmail: string | null;
  blogUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  otherSnsUrl: string | null;
  verificationToken: string;
  submittedEmail: string | null;
}

export async function insertSiteSubmission(db: D1Database, data: SiteSubmissionInput): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO sites (
        slug, name, url, tagline, description, logo_url, cover_image_url,
        category_id, subcategory_id, region, site_type, platform,
        main_keywords, service_keywords,
        operator_name, business_name, service_region, customer_center, contact_email,
        blog_url, youtube_url, instagram_url, facebook_url, other_sns_url,
        verification_token, status, submitted_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .bind(
      data.slug,
      data.name,
      data.url,
      data.tagline,
      data.description,
      data.logoUrl,
      data.coverImageUrl,
      data.categoryId,
      data.subcategoryId,
      data.region,
      data.siteType,
      data.platform,
      data.mainKeywords,
      data.serviceKeywords,
      data.operatorName,
      data.businessName,
      data.serviceRegion,
      data.customerCenter,
      data.contactEmail,
      data.blogUrl,
      data.youtubeUrl,
      data.instagramUrl,
      data.facebookUrl,
      data.otherSnsUrl,
      data.verificationToken,
      data.submittedEmail
    )
    .run();

  return result.meta.last_row_id;
}

export async function setSiteStatus(db: D1Database, id: number, status: 'approved' | 'rejected'): Promise<void> {
  if (status === 'approved') {
    await db
      .prepare(
        `UPDATE sites SET status = 'approved', approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      )
      .bind(id)
      .run();
  } else {
    await db
      .prepare(`UPDATE sites SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();
  }
}

export async function checkSiteHealth(db: D1Database, id: number, url: string): Promise<void> {
  let httpStatus: number | null = null;
  let isHttps = 0;

  try {
    isHttps = new URL(url).protocol === 'https:' ? 1 : 0;
  } catch {
    isHttps = 0;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    clearTimeout(timeoutId);
    httpStatus = response.status;
  } catch {
    httpStatus = null;
  }

  await db
    .prepare(
      `UPDATE sites SET http_status = ?, is_https = ?, last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    )
    .bind(httpStatus, isHttps, id)
    .run();
}

export interface SiteUpdateInput {
  name: string;
  url: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  categoryId: number;
  subcategoryId: number | null;
  region: string | null;
  siteType: string | null;
  platform: string | null;
  mainKeywords: string | null;
  serviceKeywords: string | null;
  operatorName: string | null;
  businessName: string | null;
  serviceRegion: string | null;
  customerCenter: string | null;
  contactEmail: string | null;
  blogUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  otherSnsUrl: string | null;
}

export async function updateSiteFields(db: D1Database, id: number, data: SiteUpdateInput): Promise<void> {
  await db
    .prepare(
      `UPDATE sites SET
        name = ?, url = ?, tagline = ?, description = ?, logo_url = ?, cover_image_url = ?,
        category_id = ?, subcategory_id = ?, region = ?, site_type = ?, platform = ?,
        main_keywords = ?, service_keywords = ?,
        operator_name = ?, business_name = ?, service_region = ?, customer_center = ?, contact_email = ?,
        blog_url = ?, youtube_url = ?, instagram_url = ?, facebook_url = ?, other_sns_url = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    )
    .bind(
      data.name,
      data.url,
      data.tagline,
      data.description,
      data.logoUrl,
      data.coverImageUrl,
      data.categoryId,
      data.subcategoryId,
      data.region,
      data.siteType,
      data.platform,
      data.mainKeywords,
      data.serviceKeywords,
      data.operatorName,
      data.businessName,
      data.serviceRegion,
      data.customerCenter,
      data.contactEmail,
      data.blogUrl,
      data.youtubeUrl,
      data.instagramUrl,
      data.facebookUrl,
      data.otherSnsUrl,
      id
    )
    .run();
}

export async function adminVerifyOwnership(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(
      `UPDATE sites SET ownership_verified = 1, verified_by_admin = 1, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    )
    .bind(id)
    .run();
}

export async function markThirdPartySubmission(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(`UPDATE sites SET third_party_submission = 1, updated_at = datetime('now') WHERE id = ?`)
    .bind(id)
    .run();
}

export async function incrementViewCount(db: D1Database, id: number): Promise<void> {
  await db.prepare('UPDATE sites SET view_count = view_count + 1 WHERE id = ?').bind(id).run();
}

export async function incrementClickCount(db: D1Database, id: number): Promise<void> {
  await db.prepare('UPDATE sites SET click_count = click_count + 1 WHERE id = ?').bind(id).run();
}

export { type Site };
