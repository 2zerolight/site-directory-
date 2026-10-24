/*
  로고 URL 칸 아래에 사이트 파비콘 후보를 보여주고, 누르면 그 주소를 칸에 넣는다.
  관리자 카드와 등록 폼이 같이 쓴다. 두 쪽의 차이는 마크업의 data 속성으로 받는다.

    data-favicon-root            이 요소 안에 [data-favicon-load] 버튼, [data-favicon-status],
                                 [data-favicon-list] 가 있다
    data-url-input / -logo-input 사이트 URL 칸과 로고 URL 칸의 id
    data-favicon-mode            admin | public. 안내 문구와 호출 방식이 다르다
    data-favicon-trigger         open  : 가장 가까운 <details> 를 처음 열 때 불러온다 (관리자 카드)
                                 change: 사이트 URL 칸이 바뀌어 벗어날 때 불러온다 (등록 폼)
    data-favicon-size            compact 면 좁은 칸에 5개가 한 줄에 들어가게 작게 그린다

  카드가 수백 개라 페이지가 열릴 때 전부 부르면 호출 한도(분당 60회)를 넘는다. 그래서 어느 쪽이든
  사람이 동작했을 때 그 한 곳만 부른다. 같은 도메인은 서버가 하루 캐시한다.
*/

type Icon = { url: string; width: number | null; height: number | null; vector: boolean };
type Result = { ok: true; icons: Icon[]; cached: boolean } | { ok: false; reason: string };

const ADMIN_MESSAGES: Record<string, string> = {
  disabled: '파비콘 API 키(FAVICON_API_KEY)가 설정되지 않았습니다.',
  unauthorized: '파비콘 API 키가 올바르지 않습니다.',
  rate_limited: '호출 한도에 걸렸습니다. 잠시 뒤에 다시 시도하세요.',
  busy: '파비콘 서비스가 바쁩니다. 잠시 뒤에 다시 시도하세요.',
  blocked: '이 주소는 조회할 수 없습니다.',
  invalid: '조회할 수 있는 사이트 URL 이 아닙니다.',
  timeout: '응답이 늦어 불러오지 못했습니다.',
};

const PUBLIC_MESSAGES: Record<string, string> = {
  rate_limited: '짧은 시간에 너무 많이 불러왔습니다. 잠시 뒤에 다시 시도해주세요.',
  busy: '지금은 아이콘을 불러올 수 없습니다. 잠시 뒤에 다시 시도하거나 주소를 직접 입력해주세요.',
  blocked: '이 주소는 아이콘을 조회할 수 없습니다. 로고 주소를 직접 입력해주세요.',
  invalid: '조회할 수 있는 사이트 URL 이 아닙니다.',
  timeout: '응답이 늦어 불러오지 못했습니다. 로고 주소를 직접 입력해도 됩니다.',
};

const ACTIVE = ['border-slate-900', 'ring-2', 'ring-slate-900', 'bg-slate-50'];
const IDLE = ['border-slate-200', 'bg-white'];

function sizeLabel(icon: Icon): string {
  if (icon.vector) return 'SVG';
  if (icon.width && icon.height) return `${icon.width}×${icon.height}`;
  return '크기 미확인';
}

const logoInputOf = (root: HTMLElement) => document.getElementById(root.dataset.logoInput ?? '') as HTMLInputElement | null;
const urlInputOf = (root: HTMLElement) => document.getElementById(root.dataset.urlInput ?? '') as HTMLInputElement | null;

function syncActive(root: HTMLElement) {
  const current = logoInputOf(root)?.value.trim() ?? '';
  root.querySelectorAll<HTMLButtonElement>('[data-favicon-url]').forEach((button) => {
    const active = current !== '' && button.dataset.faviconUrl === current;
    button.setAttribute('aria-pressed', String(active));
    button.classList.remove(...(active ? IDLE : ACTIVE));
    button.classList.add(...(active ? ACTIVE : IDLE));
  });
}

function clearList(root: HTMLElement) {
  root.querySelector('[data-favicon-list]')?.replaceChildren();
}

function render(root: HTMLElement, icons: Icon[]) {
  const list = root.querySelector<HTMLElement>('[data-favicon-list]');
  const input = logoInputOf(root);
  if (!list || !input) return;
  const compact = root.dataset.faviconSize === 'compact';
  list.replaceChildren();

  for (const icon of icons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.faviconUrl = icon.url;
    button.title = icon.url;
    button.className = `flex ${compact ? 'w-12 p-1' : 'w-16 p-1.5'} flex-col items-center gap-1 rounded-md border text-center transition hover:border-slate-400`;

    const frame = document.createElement('span');
    const frameSize = compact ? 'h-8 w-8' : 'h-10 w-10';
    frame.className = `flex ${frameSize} items-center justify-center overflow-hidden rounded bg-white`;
    const img = document.createElement('img');
    img.src = icon.url;
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.className = `${compact ? 'max-h-8 max-w-8' : 'max-h-10 max-w-10'} object-contain`;
    // 핫링크를 막는 사이트라면 미리보기가 깨진다. 선택은 여전히 할 수 있다.
    img.addEventListener('error', () => {
      frame.textContent = '표시 불가';
      frame.className = `flex ${frameSize} items-center justify-center rounded bg-slate-100 text-[9px] leading-tight text-slate-400`;
    });
    frame.appendChild(img);

    const label = document.createElement('span');
    label.className = `${compact ? 'text-[9px]' : 'text-[10px]'} leading-none text-slate-500`;
    label.textContent = sizeLabel(icon);

    button.appendChild(frame);
    button.appendChild(label);
    button.addEventListener('click', () => {
      input.value = icon.url;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      syncActive(root);
    });
    list.appendChild(button);
  }

  // 주소를 직접 고치거나 지우면 선택 표시도 따라가게 한다. 칸마다 한 번만 건다.
  if (!input.dataset.faviconBound) {
    input.dataset.faviconBound = '1';
    input.addEventListener('input', () => syncActive(root));
  }
  syncActive(root);
}

async function load(root: HTMLElement) {
  if (root.dataset.loading === '1') return;
  const target = urlInputOf(root)?.value.trim() ?? '';
  const status = root.querySelector<HTMLElement>('[data-favicon-status]');
  const button = root.querySelector<HTMLButtonElement>('[data-favicon-load]');
  if (!status || !target) return;

  const isAdmin = root.dataset.faviconMode === 'admin';
  const messages = isAdmin ? ADMIN_MESSAGES : PUBLIC_MESSAGES;
  const fallback = isAdmin ? '아이콘을 불러오지 못했습니다.' : '아이콘을 불러오지 못했습니다. 로고 주소를 직접 입력해도 됩니다.';

  root.dataset.loading = '1';
  root.dataset.loadedFor = target;
  if (button) button.disabled = true;
  status.textContent = '아이콘을 불러오는 중…';
  try {
    const res = await fetch(`/api/favicon?url=${encodeURIComponent(target)}`, { credentials: 'same-origin' });
    const data = (await res.json()) as Result;
    if (!data.ok) {
      status.textContent = messages[data.reason] ?? fallback;
      clearList(root);
    } else if (data.icons.length === 0) {
      status.textContent = isAdmin
        ? '이 사이트에서 아이콘을 찾지 못했습니다. 직접 올리거나 주소를 입력하세요.'
        : '이 사이트에서 아이콘을 찾지 못했습니다. 로고 주소를 직접 입력해주세요.';
      clearList(root);
    } else {
      status.textContent = `아이콘 ${data.icons.length}개 · 작은 순서 · 눌러서 선택${data.cached && isAdmin ? ' · 캐시된 결과' : ''}`;
      render(root, data.icons);
    }
    root.dataset.loaded = '1';
  } catch {
    status.textContent = fallback;
  } finally {
    root.dataset.loading = '';
    if (button) button.disabled = false;
  }
}

if (!document.documentElement.dataset.faviconPickerReady) {
  document.documentElement.dataset.faviconPickerReady = '1';

  // toggle 이벤트는 버블링하지 않아 캡처 단계에서 받는다.
  document.addEventListener(
    'toggle',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      const root = target.querySelector<HTMLElement>('[data-favicon-root][data-favicon-trigger="open"]');
      if (root && !root.dataset.loaded) void load(root);
    },
    true
  );

  // 사이트 URL 칸을 고쳐 쓰고 벗어났을 때. 값이 바뀐 경우에만 부른다.
  document.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement | null;
    if (!input?.id) return;
    document
      .querySelectorAll<HTMLElement>('[data-favicon-root][data-favicon-trigger="change"]')
      .forEach((root) => {
        if (root.dataset.urlInput !== input.id) return;
        if (input.value.trim() && input.value.trim() !== root.dataset.loadedFor) void load(root);
      });
  });

  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-favicon-load]');
    const root = button?.closest<HTMLElement>('[data-favicon-root]');
    if (root) void load(root);
  });
}
