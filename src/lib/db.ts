import type { Category, CategoryWithCount, Review, ReviewStatus, ReviewWithSite, Site, SiteWithCategory, Subcategory, Tag } from '../types';

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

export async function findSiteByUrlHost(db: D1Database, hostname: string): Promise<SiteWithCategory | null> {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  const row = await db
    .prepare(
      `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
       WHERE REPLACE(LOWER(s.url), '://www.', '://') LIKE '%://' || ? || '%'
       ORDER BY s.status = 'approved' DESC
       LIMIT 1`
    )
    .bind(normalized)
    .first<SiteWithCategory>();
  return row ?? null;
}

export async function getPublicStats(db: D1Database): Promise<{ totalSites: number; totalCategories: number }> {
  const [sites, categories] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM sites WHERE status = 'approved'`).first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM categories').first<{ n: number }>(),
  ]);
  return { totalSites: sites?.n ?? 0, totalCategories: categories?.n ?? 0 };
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

export interface SitemapSite {
  slug: string;
  updated_at: string;
}

export interface SitemapCategory {
  slug: string;
  last_update: string | null;
}

export async function getSitemapData(
  db: D1Database
): Promise<{ sites: SitemapSite[]; categories: SitemapCategory[]; tags: SitemapCategory[] }> {
  const [sites, categories, tags] = await Promise.all([
    db.prepare(`SELECT slug, updated_at FROM sites WHERE status = 'approved'`).all<SitemapSite>(),
    db
      .prepare(
        `SELECT c.slug AS slug, MAX(s.updated_at) AS last_update
         FROM categories c
         LEFT JOIN sites s ON s.category_id = c.id AND s.status = 'approved'
         GROUP BY c.id`
      )
      .all<SitemapCategory>(),
    db
      .prepare(
        `SELECT t.slug AS slug, MAX(s.updated_at) AS last_update
         FROM tags t
         JOIN site_tags st ON st.tag_id = t.id
         JOIN sites s ON s.id = st.site_id AND s.status = 'approved'
         GROUP BY t.id`
      )
      .all<SitemapCategory>(),
  ]);
  return { sites: sites.results, categories: categories.results, tags: tags.results };
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

export async function getSiteById(db: D1Database, id: number): Promise<SiteWithCategory | null> {
  const row = await db
    .prepare(`SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN} WHERE s.id = ?`)
    .bind(id)
    .first<SiteWithCategory>();
  return row ?? null;
}

export type AdminSiteStatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

export async function getAllSitesForExport(db: D1Database): Promise<SiteWithCategory[]> {
  const { results } = await db
    .prepare(`SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN} ORDER BY s.id ASC`)
    .all<SiteWithCategory>();
  return results;
}

export async function getSitesForAdmin(
  db: D1Database,
  opts: { status: AdminSiteStatusFilter; query?: string; limit?: number }
): Promise<{ sites: SiteWithCategory[]; total: number }> {
  const limit = opts.limit ?? 50;
  const statusFilter = opts.status === 'all' ? '' : 'AND s.status = ?';
  const queryFilter = opts.query ? 'AND (s.name LIKE ? OR s.url LIKE ?)' : '';

  const args: (string | number)[] = [];
  if (opts.status !== 'all') args.push(opts.status);
  if (opts.query) {
    const like = `%${opts.query}%`;
    args.push(like, like);
  }

  const [listResult, countResult] = await Promise.all([
    db
      .prepare(
        `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
         WHERE 1=1 ${statusFilter} ${queryFilter}
         ORDER BY s.created_at DESC
         LIMIT ?`
      )
      .bind(...args, limit)
      .all<SiteWithCategory>(),
    db
      .prepare(`SELECT COUNT(*) AS n FROM sites s WHERE 1=1 ${statusFilter} ${queryFilter}`)
      .bind(...args)
      .first<{ n: number }>(),
  ]);

  return { sites: listResult.results, total: countResult?.n ?? 0 };
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

export async function setSiteStatus(db: D1Database, id: number, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
  if (status === 'approved') {
    await db
      .prepare(
        `UPDATE sites SET status = 'approved', approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      )
      .bind(id)
      .run();
  } else if (status === 'pending') {
    await db
      .prepare(`UPDATE sites SET status = 'pending', updated_at = datetime('now') WHERE id = ?`)
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

export async function incrementHelpfulCount(db: D1Database, id: number): Promise<number | null> {
  const result = await db
    .prepare('UPDATE sites SET helpful_count = helpful_count + 1 WHERE id = ? AND status = \'approved\' RETURNING helpful_count')
    .bind(id)
    .first<{ helpful_count: number }>();
  return result?.helpful_count ?? null;
}

// ---- Tags ----

function tagSlugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function getTagBySlug(db: D1Database, slug: string): Promise<Tag | null> {
  const row = await db.prepare('SELECT * FROM tags WHERE slug = ?').bind(slug).first<Tag>();
  return row ?? null;
}

export async function getTagsForSite(db: D1Database, siteId: number): Promise<Tag[]> {
  const { results } = await db
    .prepare(
      `SELECT t.* FROM tags t JOIN site_tags st ON st.tag_id = t.id WHERE st.site_id = ? ORDER BY t.name ASC`
    )
    .bind(siteId)
    .all<Tag>();
  return results;
}

export async function getPopularTags(db: D1Database, limit = 20): Promise<(Tag & { site_count: number })[]> {
  const { results } = await db
    .prepare(
      `SELECT t.*, COUNT(st.site_id) AS site_count
       FROM tags t
       JOIN site_tags st ON st.tag_id = t.id
       JOIN sites s ON s.id = st.site_id AND s.status = 'approved'
       GROUP BY t.id
       ORDER BY site_count DESC, t.name ASC
       LIMIT ?`
    )
    .bind(limit)
    .all<Tag & { site_count: number }>();
  return results;
}

export async function getApprovedSitesByTag(
  db: D1Database,
  tagSlug: string,
  page: number
): Promise<{ sites: SiteWithCategory[]; total: number; tag: Tag | null }> {
  const tag = await getTagBySlug(db, tagSlug);
  if (!tag) return { sites: [], total: 0, tag: null };

  const offset = (page - 1) * PAGE_SIZE;
  const [listResult, countResult] = await Promise.all([
    db
      .prepare(
        `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
         JOIN site_tags st ON st.site_id = s.id
         WHERE st.tag_id = ? AND s.status = 'approved'
         ORDER BY s.view_count DESC, s.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(tag.id, PAGE_SIZE, offset)
      .all<SiteWithCategory>(),
    db
      .prepare(`SELECT COUNT(*) AS n FROM site_tags st JOIN sites s ON s.id = st.site_id WHERE st.tag_id = ? AND s.status = 'approved'`)
      .bind(tag.id)
      .first<{ n: number }>(),
  ]);

  return { sites: listResult.results, total: countResult?.n ?? 0, tag };
}

export async function setSiteTags(db: D1Database, siteId: number, tagNames: string[]): Promise<void> {
  const cleanNames = [...new Set(tagNames.map((n) => n.trim()).filter(Boolean))].slice(0, 15);

  const tagIds: number[] = [];
  for (const name of cleanNames) {
    const existing = await db.prepare('SELECT id FROM tags WHERE name = ?').bind(name).first<{ id: number }>();
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    let slug = tagSlugify(name) || 'tag';
    let attempt = 0;
    while (await db.prepare('SELECT 1 FROM tags WHERE slug = ?').bind(slug).first()) {
      attempt += 1;
      slug = `${tagSlugify(name) || 'tag'}-${attempt}`;
    }
    const result = await db.prepare('INSERT INTO tags (slug, name) VALUES (?, ?)').bind(slug, name).run();
    tagIds.push(result.meta.last_row_id);
  }

  await db.prepare('DELETE FROM site_tags WHERE site_id = ?').bind(siteId).run();
  for (const tagId of tagIds) {
    await db.prepare('INSERT INTO site_tags (site_id, tag_id) VALUES (?, ?)').bind(siteId, tagId).run();
  }
}

// ---- Reviews ----

export interface ReviewInput {
  siteId: number;
  rating: number;
  authorName: string | null;
  comment: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function insertReview(db: D1Database, data: ReviewInput): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO reviews (site_id, rating, author_name, comment, status, ip_address, user_agent)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`
    )
    .bind(data.siteId, data.rating, data.authorName, data.comment, data.ipAddress, data.userAgent)
    .run();

  await logReviewEvent(db, {
    reviewId: result.meta.last_row_id,
    siteId: data.siteId,
    event: 'submitted',
    rating: data.rating,
    authorName: data.authorName,
    comment: data.comment,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    actor: 'visitor',
  });
}

interface ReviewAuditEntry {
  reviewId: number;
  siteId: number;
  event: 'submitted' | 'approved' | 'rejected' | 'deleted';
  rating: number;
  authorName: string | null;
  comment: string;
  ipAddress: string | null;
  userAgent: string | null;
  actor: string;
}

async function logReviewEvent(db: D1Database, entry: ReviewAuditEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO review_audit_log (review_id, site_id, event, rating, author_name, comment, ip_address, user_agent, actor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.reviewId,
      entry.siteId,
      entry.event,
      entry.rating,
      entry.authorName,
      entry.comment,
      entry.ipAddress,
      entry.userAgent,
      entry.actor
    )
    .run();
}

export async function getApprovedReviewsForSite(db: D1Database, siteId: number): Promise<Review[]> {
  const { results } = await db
    .prepare(`SELECT * FROM reviews WHERE site_id = ? AND status = 'approved' ORDER BY created_at DESC`)
    .bind(siteId)
    .all<Review>();
  return results;
}

export async function getReviewStats(db: D1Database, siteId: number): Promise<{ avg: number; count: number }> {
  const row = await db
    .prepare(`SELECT AVG(rating) AS avg, COUNT(*) AS count FROM reviews WHERE site_id = ? AND status = 'approved'`)
    .bind(siteId)
    .first<{ avg: number | null; count: number }>();
  return { avg: row?.avg ?? 0, count: row?.count ?? 0 };
}

export type AdminReviewStatusFilter = ReviewStatus | 'all';

export async function getReviewsByStatus(
  db: D1Database,
  status: AdminReviewStatusFilter,
  limit = 50
): Promise<ReviewWithSite[]> {
  const where = status === 'all' ? '' : 'WHERE r.status = ?';
  const args = status === 'all' ? [] : [status];
  const { results } = await db
    .prepare(
      `SELECT r.*, s.name AS site_name, s.slug AS site_slug
       FROM reviews r JOIN sites s ON s.id = r.site_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ?`
    )
    .bind(...args, limit)
    .all<ReviewWithSite>();
  return results;
}

export async function setReviewStatus(db: D1Database, id: number, status: 'approved' | 'rejected'): Promise<void> {
  const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(id).first<Review>();
  if (!review) return;

  await db.prepare('UPDATE reviews SET status = ? WHERE id = ?').bind(status, id).run();

  await logReviewEvent(db, {
    reviewId: review.id,
    siteId: review.site_id,
    event: status,
    rating: review.rating,
    authorName: review.author_name,
    comment: review.comment,
    ipAddress: review.ip_address,
    userAgent: review.user_agent,
    actor: 'admin',
  });
}

export async function deleteReview(db: D1Database, id: number): Promise<void> {
  const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(id).first<Review>();
  if (!review) return;

  await logReviewEvent(db, {
    reviewId: review.id,
    siteId: review.site_id,
    event: 'deleted',
    rating: review.rating,
    authorName: review.author_name,
    comment: review.comment,
    ipAddress: review.ip_address,
    userAgent: review.user_agent,
    actor: 'admin',
  });

  await db.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
}

// ---- Bookmarks ----

export async function getSitesByIds(db: D1Database, ids: number[]): Promise<SiteWithCategory[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const { results } = await db
    .prepare(
      `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
       WHERE s.id IN (${placeholders}) AND s.status = 'approved'`
    )
    .bind(...ids)
    .all<SiteWithCategory>();
  return results;
}

// ---- Search suggestions ----

export interface SearchSuggestion {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  category_name: string;
}

export async function searchSiteSuggestions(db: D1Database, query: string, limit = 6): Promise<SearchSuggestion[]> {
  const like = `%${query}%`;
  const { results } = await db
    .prepare(
      `SELECT s.id, s.name, s.slug, s.logo_url, c.name AS category_name
       FROM sites s JOIN categories c ON c.id = s.category_id
       WHERE s.status = 'approved' AND s.name LIKE ?
       ORDER BY s.view_count DESC
       LIMIT ?`
    )
    .bind(like, limit)
    .all<SearchSuggestion>();
  return results;
}

// ---- Admin stats ----

export interface DashboardStats {
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  categoryBreakdown: { name: string; slug: string; count: number }[];
  topByViews: SiteWithCategory[];
  topByClicks: SiteWithCategory[];
  recentlyAdded: SiteWithCategory[];
  pendingReviewsCount: number;
  staleSitesCount: number;
}

export async function getDashboardStats(db: D1Database): Promise<DashboardStats> {
  const [statusCounts, categoryBreakdown, topByViews, topByClicks, recentlyAdded, pendingReviews, staleSites] =
    await Promise.all([
      db.prepare(`SELECT status, COUNT(*) AS n FROM sites GROUP BY status`).all<{ status: string; n: number }>(),
      db
        .prepare(
          `SELECT c.name, c.slug, COUNT(s.id) AS count
           FROM categories c LEFT JOIN sites s ON s.category_id = c.id AND s.status = 'approved'
           GROUP BY c.id ORDER BY c.sort_order ASC`
        )
        .all<{ name: string; slug: string; count: number }>(),
      db
        .prepare(`SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN} WHERE s.status = 'approved' ORDER BY s.view_count DESC LIMIT 10`)
        .all<SiteWithCategory>(),
      db
        .prepare(`SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN} WHERE s.status = 'approved' ORDER BY s.click_count DESC LIMIT 10`)
        .all<SiteWithCategory>(),
      db
        .prepare(`SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN} WHERE s.status = 'approved' ORDER BY s.created_at DESC LIMIT 10`)
        .all<SiteWithCategory>(),
      db.prepare(`SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'`).first<{ n: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM sites WHERE status = 'approved' AND (last_checked_at IS NULL OR last_checked_at < datetime('now', '-30 days'))`
        )
        .first<{ n: number }>(),
    ]);

  const byStatus = Object.fromEntries(statusCounts.results.map((r) => [r.status, r.n]));

  return {
    totalApproved: byStatus.approved ?? 0,
    totalPending: byStatus.pending ?? 0,
    totalRejected: byStatus.rejected ?? 0,
    categoryBreakdown: categoryBreakdown.results,
    topByViews: topByViews.results,
    topByClicks: topByClicks.results,
    recentlyAdded: recentlyAdded.results,
    pendingReviewsCount: pendingReviews?.n ?? 0,
    staleSitesCount: staleSites?.n ?? 0,
  };
}

export async function getStaleApprovedSites(db: D1Database, limit = 20): Promise<SiteWithCategory[]> {
  const { results } = await db
    .prepare(
      `SELECT ${SITE_WITH_CATEGORY_SELECT} ${SITE_WITH_CATEGORY_JOIN}
       WHERE s.status = 'approved'
       ORDER BY CASE WHEN s.last_checked_at IS NULL THEN 0 ELSE 1 END, s.last_checked_at ASC
       LIMIT ?`
    )
    .bind(limit)
    .all<SiteWithCategory>();
  return results;
}

export { type Site };
