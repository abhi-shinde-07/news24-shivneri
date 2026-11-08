export const PER_PAGE = 20;
export const pageFrom = (url: URL) => {
  const n = Number(url.searchParams.get('page') ?? '1');
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
};
export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export const SITE = 'https://www.news24shivneri.in';
