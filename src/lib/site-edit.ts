import type { Category, Subcategory, SiteWithCategory } from '../types';
import { REGIONS, SITE_TYPES, PLATFORMS } from './constants';
import { normalizeOptionalUrl } from './urls';
import { OWN_LOGO_PATH } from './logo-upload';
import {
  updateSiteFields,
  deleteSiteLogo,
  resolveEditRequest,
  setSiteSubmittedEmail,
  getEditRequestById,
  getSiteById,
  type SiteUpdateInput,
} from './db';

/*
  사이트 수정 신청.

  운영자가 정보를 고치고 싶다고 신청하면 바로 반영하지 않고 "달라진 항목만" 저장해 둔다.
  관리자가 diff 를 보고 반영한다. 그래서 이 파일은 세 가지를 한다.

    1. 신청 폼의 항목 정의와 검증 (등록 폼과 같은 기준)
    2. 현재 값과 비교해 달라진 항목만 추리기
    3. 관리자가 반영할 때 그 항목만 덮어써서 저장하기

  이메일 일치 여부는 "등록할 때 적은 이메일을 아는 사람"이라는 약한 확인일 뿐이다. 이메일
  주소는 비밀이 아니므로 신청을 자동으로 믿지 않고, 반영은 항상 관리자 손을 거친다.
*/

/*
  사이트 주소(url)는 일부러 항목에서 뺐다. 주소를 바꿀 수 있으면 남의 사이트 등록을 다른
  도메인으로 바꿔치기할 수 있고, 소유권 인증도 이전 도메인 기준이라 어긋난다. 주소가 바뀐
  경우는 문의 메일로 받아 관리자가 직접 처리한다. 항목에 없으므로 요청 본문에 url 을 실어
  보내도 검증·비교·반영 어디에서도 읽지 않는다.
*/
export const EDIT_KEYS = [
  'name', 'tagline', 'description', 'logoUrl', 'coverImageUrl',
  'categoryId', 'subcategoryId', 'region', 'siteType', 'platform',
  'mainKeywords', 'serviceKeywords',
  'operatorName', 'businessName', 'serviceRegion', 'customerCenter', 'contactEmail',
  'blogUrl', 'youtubeUrl', 'instagramUrl', 'facebookUrl', 'otherSnsUrl',
] as const;

export type EditKey = (typeof EDIT_KEYS)[number];
export type EditValues = Record<EditKey, string>;
export type EditChanges = Partial<EditValues>;

export const EDIT_LABELS: Record<EditKey, string> = {
  name: '사이트 이름',
  tagline: '한 줄 소개',
  description: '상세 설명',
  logoUrl: '로고 이미지 URL',
  coverImageUrl: '대표 이미지 URL',
  categoryId: '대분류',
  subcategoryId: '중분류',
  region: '지역',
  siteType: '사이트 유형',
  platform: '플랫폼',
  mainKeywords: '주요 키워드',
  serviceKeywords: '서비스 키워드',
  operatorName: '운영 주체',
  businessName: '사업자명',
  serviceRegion: '서비스 지역',
  customerCenter: '고객센터',
  contactEmail: '공개 이메일',
  blogUrl: '블로그',
  youtubeUrl: '유튜브',
  instagramUrl: '인스타그램',
  facebookUrl: '페이스북',
  otherSnsUrl: '기타 SNS',
};

const OPTIONAL_URL_KEYS: EditKey[] = ['logoUrl', 'coverImageUrl', 'blogUrl', 'youtubeUrl', 'instagramUrl', 'facebookUrl', 'otherSnsUrl'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** ab***@gmail.com. 본인이 어느 이메일을 썼는지 기억해 내도록 돕되 전체를 드러내지는 않는다. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const shown = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${shown}***@${domain}`;
}

export function siteFieldValues(site: SiteWithCategory): EditValues {
  return {
    name: site.name,
    tagline: site.tagline ?? '',
    description: site.description ?? '',
    logoUrl: site.logo_url ?? '',
    coverImageUrl: site.cover_image_url ?? '',
    categoryId: String(site.category_id),
    subcategoryId: site.subcategory_id ? String(site.subcategory_id) : '',
    region: site.region ?? '',
    siteType: site.site_type ?? '',
    platform: site.platform ?? '',
    mainKeywords: site.main_keywords ?? '',
    serviceKeywords: site.service_keywords ?? '',
    operatorName: site.operator_name ?? '',
    businessName: site.business_name ?? '',
    serviceRegion: site.service_region ?? '',
    customerCenter: site.customer_center ?? '',
    contactEmail: site.contact_email ?? '',
    blogUrl: site.blog_url ?? '',
    youtubeUrl: site.youtube_url ?? '',
    instagramUrl: site.instagram_url ?? '',
    facebookUrl: site.facebook_url ?? '',
    otherSnsUrl: site.other_sns_url ?? '',
  };
}

/** 비교용 정규형. 예전에 정규화 없이 들어간 URL 이 "바뀐 것"으로 잡히지 않게 한다. */
function canon(key: EditKey, raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (OPTIONAL_URL_KEYS.includes(key)) {
    if (key === 'logoUrl' && OWN_LOGO_PATH.test(value)) return value;
    return normalizeOptionalUrl(value).value ?? value;
  }
  return value;
}

export type ParseResult = { ok: true; values: EditValues } | { ok: false; error: string };

export function parseEditForm(
  get: (key: string) => string,
  categories: Category[],
  subcategories: Subcategory[]
): ParseResult {
  const raw = {} as EditValues;
  for (const key of EDIT_KEYS) raw[key] = get(key);

  const fail = (error: string): ParseResult => ({ ok: false, error });

  if (!raw.name || raw.name.length > 100) return fail('사이트 이름을 입력해주세요 (100자 이내).');
  if (!raw.tagline || raw.tagline.length > 120) return fail('한 줄 소개를 입력해주세요 (120자 이내).');
  if (!raw.description || raw.description.length > 2000) return fail('상세 설명을 입력해주세요 (2000자 이내).');

  const category = categories.find((c) => String(c.id) === raw.categoryId);
  if (!category) return fail('대분류를 선택해주세요.');
  const subcategory = raw.subcategoryId ? subcategories.find((s) => String(s.id) === raw.subcategoryId) : null;
  if (raw.subcategoryId && !subcategory) return fail('올바른 중분류를 선택해주세요.');
  if (subcategory && subcategory.category_id !== category.id) return fail('선택한 중분류가 대분류와 일치하지 않습니다.');

  if (raw.region && !(REGIONS as readonly string[]).includes(raw.region)) return fail('올바른 지역을 선택해주세요.');
  if (raw.siteType && !(SITE_TYPES as readonly string[]).includes(raw.siteType)) return fail('올바른 사이트 유형을 선택해주세요.');
  if (raw.platform && !(PLATFORMS as readonly string[]).includes(raw.platform)) return fail('올바른 플랫폼을 선택해주세요.');
  if (raw.contactEmail && !isValidEmail(raw.contactEmail)) return fail('공개 이메일 형식을 확인해주세요.');

  const values = { ...raw } as EditValues;
  for (const key of OPTIONAL_URL_KEYS) {
    if (!raw[key]) continue;
    if (key === 'logoUrl' && OWN_LOGO_PATH.test(raw[key])) continue;
    const normalized = normalizeOptionalUrl(raw[key]);
    if (!normalized.ok) return fail('이미지·SNS URL 형식을 확인해주세요 (예: example.com).');
    values[key] = normalized.value ?? '';
  }

  for (const key of ['mainKeywords', 'serviceKeywords', 'operatorName', 'businessName', 'serviceRegion', 'customerCenter'] as const) {
    if (values[key].length > 300) return fail(`${EDIT_LABELS[key]}이(가) 너무 깁니다 (300자 이내).`);
  }

  return { ok: true, values };
}

export function computeChanges(site: SiteWithCategory, next: EditValues): EditChanges {
  const current = siteFieldValues(site);
  const changes: EditChanges = {};
  for (const key of EDIT_KEYS) {
    if (canon(key, current[key]) !== next[key].trim()) changes[key] = next[key].trim();
  }
  return changes;
}

export function parseChanges(json: string): EditChanges {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const changes: EditChanges = {};
    for (const key of EDIT_KEYS) {
      if (typeof parsed[key] === 'string') changes[key] = parsed[key] as string;
    }
    return changes;
  } catch {
    return {};
  }
}

/** 화면에 보여줄 값. 분류는 id 대신 이름으로, 빈 값은 "(비어 있음)"으로. */
export function displayValue(key: EditKey, value: string, categories: Category[], subcategories: Subcategory[]): string {
  if (!value) return '(비어 있음)';
  if (key === 'categoryId') return categories.find((c) => String(c.id) === value)?.name ?? value;
  if (key === 'subcategoryId') return subcategories.find((s) => String(s.id) === value)?.name ?? value;
  return value;
}

function nullable(value: string): string | null {
  return value ? value : null;
}

export function buildUpdateInput(site: SiteWithCategory, changes: EditChanges): SiteUpdateInput {
  const v = { ...siteFieldValues(site), ...changes };
  return {
    name: v.name,
    url: site.url,
    tagline: v.tagline,
    description: v.description,
    logoUrl: nullable(v.logoUrl),
    coverImageUrl: nullable(v.coverImageUrl),
    categoryId: Number(v.categoryId),
    subcategoryId: v.subcategoryId ? Number(v.subcategoryId) : null,
    region: nullable(v.region),
    siteType: nullable(v.siteType),
    platform: nullable(v.platform),
    mainKeywords: nullable(v.mainKeywords),
    serviceKeywords: nullable(v.serviceKeywords),
    operatorName: nullable(v.operatorName),
    businessName: nullable(v.businessName),
    serviceRegion: nullable(v.serviceRegion),
    customerCenter: nullable(v.customerCenter),
    contactEmail: nullable(v.contactEmail),
    blogUrl: nullable(v.blogUrl),
    youtubeUrl: nullable(v.youtubeUrl),
    instagramUrl: nullable(v.instagramUrl),
    facebookUrl: nullable(v.facebookUrl),
    otherSnsUrl: nullable(v.otherSnsUrl),
  };
}

export type ApplyResult =
  | { ok: true; site: SiteWithCategory; changedKeys: EditKey[] }
  | { ok: false; reason: 'not_found' | 'already_resolved' | 'no_changes' };

/** 관리자 화면과 텔레그램 버튼이 같은 절차로 반영한다. */
export async function applyEditRequest(
  db: D1Database,
  requestId: number,
  options: { setSubmittedEmail?: boolean } = {}
): Promise<ApplyResult> {
  const request = await getEditRequestById(db, requestId);
  if (!request) return { ok: false, reason: 'not_found' };
  if (request.status !== 'pending') return { ok: false, reason: 'already_resolved' };

  const site = await getSiteById(db, request.site_id);
  if (!site) return { ok: false, reason: 'not_found' };

  const changes = parseChanges(request.changes_json);
  const changedKeys = (Object.keys(changes) as EditKey[]).filter((key) => EDIT_KEYS.includes(key));
  if (changedKeys.length === 0) return { ok: false, reason: 'no_changes' };

  const input = buildUpdateInput(site, changes);

  // 신청 이후 분류가 바뀌었을 수 있다. 맞지 않는 중분류는 비워서 저장한다.
  if (input.subcategoryId) {
    const sub = await db
      .prepare('SELECT category_id FROM subcategories WHERE id = ?')
      .bind(input.subcategoryId)
      .first<{ category_id: number }>();
    if (!sub || sub.category_id !== input.categoryId) input.subcategoryId = null;
  }

  await updateSiteFields(db, site.id, input);

  // 직접 올린 로고는 주소가 외부 URL 로 바뀌거나 비워지면 지운다. 관리자 화면의 수정과 같은 규칙이다.
  if ('logoUrl' in changes && !OWN_LOGO_PATH.test(changes.logoUrl ?? '')) {
    await deleteSiteLogo(db, site.id);
  }

  if (options.setSubmittedEmail && !site.submitted_email) {
    await setSiteSubmittedEmail(db, site.id, request.requester_email);
  }

  await resolveEditRequest(db, requestId, 'applied');
  return { ok: true, site, changedKeys };
}
