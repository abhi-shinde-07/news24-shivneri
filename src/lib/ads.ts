import type { D1 } from './db';
import { cachedJson } from './cache';

export const POSITIONS = ['top', 'main_headline', 'sidebar', 'in_between', 'bottom', 'article_top', 'article_middle', 'article_bottom', 'category_top'] as const;
export type Position = (typeof POSITIONS)[number];
export const POSITION_LABEL: Record<Position, string> = {
  top: 'प्रत्येक पानाच्या वर', main_headline: 'मुख्यपृष्ठ – मुख्य बातमीच्या वर', sidebar: 'बाजूची पट्टी',
  in_between: 'मुख्यपृष्ठ – बातम्यांच्या मध्ये', bottom: 'प्रत्येक पानाच्या तळाशी',
  article_top: 'बातमी पान – फोटोखाली', article_middle: 'बातमी पान – मजकुराच्या मध्ये', article_bottom: 'बातमी पान – बातमीच्या शेवटी',
  category_top: 'विभाग पान – वर',
};
export const ADS_CACHE_KEY = 'ads-v2';
// has_link: 1 = click opens the advertiser's link, 0 = click shows the ad picture large.
export type LiveAd = { id: number; advertiser: string; image_key: string; position: Position; has_link: number };

// All live ads, cached at the edge for 5 minutes so page views do not query D1 for ads.
export const getLiveAds = (db: D1, locals: any) =>
  cachedJson<LiveAd[]>(locals, ADS_CACHE_KEY, 300, async () =>
    (await db.prepare(
      `SELECT id, advertiser, image_key, position, (click_url LIKE 'https://%') AS has_link FROM ads WHERE status = 'active'
       AND start_date <= date('now') AND end_date >= date('now')`).all<LiveAd>()).results);
