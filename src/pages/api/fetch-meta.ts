import type { APIRoute } from 'astro';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function isImage(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': UA } });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    return (res.headers.get('content-type') ?? '').startsWith('image/');
  } catch {
    return false;
  }
}

export const GET: APIRoute = async ({ url: requestUrl }) => {
  const target = requestUrl.searchParams.get('url')?.trim() ?? '';

  let parsed: URL;
  try {
    parsed = new URL(target);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
  } catch {
    return json({ ok: false, error: '올바른 URL이 아닙니다.' }, 400);
  }

  let title = '';
  let description = '';
  let ogDescription = '';
  let ogSiteName = '';
  const iconHrefs: string[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return json({ ok: false, error: `사이트 응답 오류 (HTTP ${response.status})` });
    }

    const rewriter = new HTMLRewriter()
      .on('title', {
        text(chunk) {
          title += chunk.text;
        },
      })
      .on('meta[name="description" i]', {
        element(el) {
          description = el.getAttribute('content') ?? description;
        },
      })
      .on('meta[property="og:description" i]', {
        element(el) {
          ogDescription = el.getAttribute('content') ?? ogDescription;
        },
      })
      .on('meta[property="og:site_name" i]', {
        element(el) {
          ogSiteName = el.getAttribute('content') ?? ogSiteName;
        },
      })
      .on(
        'link[rel="icon" i], link[rel="shortcut icon" i], link[rel="apple-touch-icon" i], link[rel="apple-touch-icon-precomposed" i]',
        {
          element(el) {
            const href = el.getAttribute('href');
            if (href) iconHrefs.push(href);
          },
        }
      );

    await new Response(rewriter.transform(response).body).text();
  } catch {
    return json({ ok: false, error: '사이트에 접속할 수 없습니다.' });
  }

  const name = decodeEntities(ogSiteName || title).slice(0, 100);
  const desc = decodeEntities(description || ogDescription).slice(0, 2000);

  let logoUrl: string | null = null;
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
  if (await isImage(googleFavicon)) {
    logoUrl = googleFavicon;
  } else {
    for (const href of iconHrefs) {
      try {
        const resolved = new URL(href, parsed).toString();
        if (await isImage(resolved)) {
          logoUrl = resolved;
          break;
        }
      } catch {
        // skip malformed href, try next candidate
      }
    }
  }

  return json({
    ok: true,
    name,
    tagline: desc.slice(0, 120),
    description: desc,
    logoUrl,
  });
};
