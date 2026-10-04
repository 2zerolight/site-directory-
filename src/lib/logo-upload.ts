/*
  관리자가 올린 로고 파일 검증.

  확장자나 브라우저가 알려주는 MIME 은 믿지 않고 파일 앞부분(매직 바이트)으로 종류를
  판별한다. 이 파일은 우리 도메인에서 그대로 서빙되므로, 이미지가 아닌 것이 이미지인
  척 들어오면 안 된다.

  SVG 는 스크립트를 품을 수 있어서 허용하되 서빙할 때 CSP 로 막는다(/logo/[id].ts).
*/

export const MAX_LOGO_BYTES = 200 * 1024;

export type LogoContentType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/svg+xml';

export type LogoUploadError = 'size' | 'type';

export type LogoUploadResult =
  | { ok: true; contentType: LogoContentType; base64: string; byteSize: number }
  | { ok: false; error: LogoUploadError };

export const LOGO_ERROR_MESSAGES: Record<LogoUploadError, string> = {
  size: `로고 파일이 너무 큽니다. ${MAX_LOGO_BYTES / 1024}KB 이하로 올려주세요. 로고는 화면에서 작게만 쓰이니 가로세로 256px 안팎이면 충분합니다.`,
  type: '로고 파일 형식을 인식하지 못했습니다. PNG, JPG, GIF, WebP, SVG 만 올릴 수 있습니다.',
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((value, i) => bytes[offset + i] === value);
}

function sniffContentType(bytes: Uint8Array): LogoContentType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';

  const head = new TextDecoder().decode(bytes.slice(0, 1024)).replace(/^﻿/, '').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml';
  return null;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function readLogoUpload(file: File): Promise<LogoUploadResult> {
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: 'size' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_LOGO_BYTES) return { ok: false, error: 'size' };
  const contentType = sniffContentType(bytes);
  if (!contentType) return { ok: false, error: 'type' };
  return { ok: true, contentType, base64: toBase64(bytes), byteSize: bytes.length };
}

/** 업로드한 로고를 가리키는 주소인지. 이 형태만 정규화 없이 그대로 저장한다. */
export const OWN_LOGO_PATH = /^\/logo\/\d+(\?v=[a-z0-9]+)?$/;

export function ownLogoPath(siteId: number): string {
  return `/logo/${siteId}?v=${Date.now().toString(36)}`;
}
