// Works on server and client. Set PUBLIC_MEDIA_BASE (e.g. https://media.news24shivneri.in) once R2 has a public domain;
// until then images are served by the /media route.
const BASE = ((import.meta.env.PUBLIC_MEDIA_BASE as string | undefined) ?? '').replace(/\/$/, '') || '/media';
export const mediaUrl = (key: string) => `${BASE}/${key}`;
export const rewriteBody = (html: string) => (BASE === '/media' ? html : html.replaceAll('src="/media/', `src="${BASE}/`));
