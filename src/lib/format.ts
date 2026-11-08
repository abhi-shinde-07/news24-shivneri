export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('mr-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
// For plain YYYY-MM-DD dates (e-paper editions).
export const fmtDay = (ymd: string) =>
  new Date(ymd + 'T00:00:00Z').toLocaleDateString('mr-IN', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
export const fmtSize = (bytes: number) =>
  bytes >= 1073741824 ? `${(bytes / 1073741824).toFixed(2)} GB` : `${(bytes / 1048576).toFixed(1)} MB`;
