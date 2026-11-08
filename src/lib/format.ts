export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('mr-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
