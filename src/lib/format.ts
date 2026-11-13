export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('mr-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
// For plain YYYY-MM-DD dates (e-paper editions).
export const fmtDay = (ymd: string) =>
  new Date(ymd + 'T00:00:00Z').toLocaleDateString('mr-IN', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
export const fmtSize = (bytes: number) =>
  bytes >= 1073741824 ? `${(bytes / 1073741824).toFixed(2)} GB` : `${(bytes / 1048576).toFixed(1)} MB`;
// Plain-text start of an article body, cut at a word boundary.
export function excerpt(html: string, max = 220) {
  const t = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)) + '…';
}
