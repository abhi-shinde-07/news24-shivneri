export const MAX_PDF = 25 * 1024 * 1024; // change here to allow bigger e-paper PDFs
export const MAX_COVER = 1024 * 1024;
export const EPAPER_KEY_RE = /^epaper\/\d{4}\/\d{2}\/[a-z0-9-]+\.(pdf|webp|jpg|png)$/;
export const isPdf = (b: Uint8Array) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF

export function epaperKey(date: string, ext: string) {
  const [y, m] = date.split('-');
  const rand = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `epaper/${y}/${m}/${date}-${rand}.${ext}`;
}
