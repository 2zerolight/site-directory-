export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
}

export interface Subcategory {
  id: number;
  category_id: number;
  slug: string;
  name: string;
  sort_order: number;
}

export type SiteStatus = 'pending' | 'approved' | 'rejected';
export type VerificationMethod = 'meta_tag' | 'dns_txt' | null;

export interface Site {
  id: number;
  slug: string;

  // 기본정보
  name: string;
  url: string;
  tagline: string;
  description: string;
  logo_url: string | null;
  cover_image_url: string | null;

  // 분류
  category_id: number;
  subcategory_id: number | null;
  region: string | null;
  site_type: string | null;
  platform: string | null;

  // 검색
  main_keywords: string | null;
  service_keywords: string | null;

  // 운영
  operator_name: string | null;
  business_name: string | null;
  service_region: string | null;
  customer_center: string | null;
  contact_email: string | null;

  // 외부 채널
  blog_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  other_sns_url: string | null;

  // 검증
  http_status: number | null;
  is_https: number | null;
  ownership_verified: number;
  verification_token: string | null;
  verification_method: VerificationMethod;
  third_party_submission: number;
  verified_by_admin: number;
  last_checked_at: string | null;
  verified_at: string | null;

  status: SiteStatus;
  submitted_email: string | null;
  view_count: number;
  click_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface SiteWithCategory extends Site {
  category_name: string;
  category_slug: string;
  subcategory_name: string | null;
  subcategory_slug: string | null;
}

export interface CategoryWithCount extends Category {
  site_count: number;
}

export interface Tag {
  id: number;
  slug: string;
  name: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: number;
  site_id: number;
  rating: number;
  author_name: string | null;
  comment: string;
  status: ReviewStatus;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ReviewWithSite extends Review {
  site_name: string;
  site_slug: string;
}
