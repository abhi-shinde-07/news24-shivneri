// Works on server and client. Set PUBLIC_MEDIA_BASE (e.g. https://media.news24shivneri.in) once R2 has a public domain;
// until then images are served by the /media route.
const BASE = ((import.meta.env.PUBLIC_MEDIA_BASE as string | undefined) ?? '').replace(/\/$/, '') || '/media';
export const mediaUrl = (key: string) => `${BASE}/${key}`;
// List/hero picture for an article: its own photo, else its YouTube video's thumbnail.
export const thumbOf = (a: { main_image_key?: string | null; youtube_id?: string | null }, size = 'hqdefault') =>
  a.main_image_key ? mediaUrl(a.main_image_key) : a.youtube_id ? `https://i.ytimg.com/vi/${a.youtube_id}/${size}.jpg` : null;
export const rewriteBody = (html: string) => (BASE === '/media' ? html : html.replaceAll('src="/media/', `src="${BASE}/`));
