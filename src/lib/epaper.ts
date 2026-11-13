export const MAX_PDF = 25 * 1024 * 1024; // change here to allow bigger e-paper PDFs
export const MAX_COVER = 1024 * 1024;
export const EPAPER_KEY_RE = /^epaper\/\d{4}\/\d{2}\/[a-z0-9-]+\.(pdf|webp|jpg|png)$/;
export const isPdf = (b: Uint8Array) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF

export function epaperKey(date: string, ext: string) {
  const [y, m] = date.split('-');
  const rand = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `epaper/${y}/${m}/${date}-${rand}.${ext}`;
}

// ---- E-paper built in the admin (no PDF): pages of news blocks stored as JSON in epapers.layout ----
export type EpItem = { id: string; aid?: number; h: string; t: string; loc?: string; img?: string; s: 1 | 2 | 3 | 4 };
export type EpLayout = { pages: { items: EpItem[] }[] };
const IMG_RE = /^img\/\d{4}\/\d{2}\/[a-z0-9]+\.(webp|jpg|png)$/;

// Accept only the expected shape and sizes; everything is rendered as escaped text.
export function cleanLayout(raw: unknown): EpLayout | null {
  const r = raw as EpLayout;
  if (!r || !Array.isArray(r.pages) || r.pages.length === 0 || r.pages.length > 24) return null;
  const pages = r.pages.map((p) => ({
    items: (Array.isArray(p?.items) ? p.items : []).slice(0, 30).map((i) => ({
      id: String(i?.id ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 16) || Math.random().toString(36).slice(2, 10),
      ...(Number.isInteger(i?.aid) ? { aid: i.aid } : {}),
      h: String(i?.h ?? '').slice(0, 300),
      t: String(i?.t ?? '').slice(0, 12000),
      ...(i?.loc ? { loc: String(i.loc).slice(0, 80) } : {}),
      ...(typeof i?.img === 'string' && IMG_RE.test(i.img) ? { img: i.img } : {}),
      s: ([1, 2, 3, 4].includes(Number(i?.s)) ? Number(i.s) : 1) as EpItem['s'],
    })),
  }));
  return { pages };
}
export const paras = (t: string) => t.split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean);
export const findItem = (l: EpLayout, id: string) => {
  for (let n = 0; n < l.pages.length; n++) { const it = l.pages[n].items.find((i) => i.id === id); if (it) return { it, page: n + 1 }; }
  return null;
};
