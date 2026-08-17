// Generates a URL-safe slug from a site name. Korean/CJK characters and other
// non-Latin scripts don't romanize meaningfully, so they're kept as-is and only
// unsafe URL characters are stripped — the trailing random suffix guarantees
// uniqueness even when two names collapse to the same slug.
export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}
