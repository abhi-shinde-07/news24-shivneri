export type R2 = {
  put(key: string, value: Uint8Array, o?: unknown): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpEtag: string; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
};
export const getBucket = (locals: any): R2 => locals.runtime.env.MEDIA;
export const MAX_UPLOAD = 2.5 * 1024 * 1024;
export const KEY_RE = /^img\/\d{4}\/\d{2}\/[a-z0-9]+\.(webp|jpg|png)$/;

// Detect the real file type from its first bytes (never trust the filename).
export function sniffImage(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  const s = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (s(0, 4) === 'RIFF' && s(8, 4) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}
export function newKey(ext: string) {
  const d = new Date();
  const rand = [...crypto.getRandomValues(new Uint8Array(10))].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `img/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${rand}.${ext}`;
}
