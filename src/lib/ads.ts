import type { D1 } from './db';
import { cachedJson } from './cache';

export const POSITIONS = ['top', 'main_headline', 'sidebar', 'in_between', 'bottom'] as const;
export type Position = (typeof POSITIONS)[number];
export const POSITION_LABEL: Record<Position, string> = {
  top: 'वर (Top)', main_headline: 'मुख्य बातमीजवळ', sidebar: 'बाजूची पट्टी', in_between: 'बातम्यांच्या मध्ये', bottom: 'तळाशी (Bottom)',
};
export type LiveAd = { id: number; advertiser: string; image_key: string; position: Position };

// All live ads, cached at the edge for 5 minutes so page views do not query D1 for ads.
export const getLiveAds = (db: D1, locals: any) =>
  cachedJson<LiveAd[]>(locals, 'ads-v1', 300, async () =>
    (await db.prepare(
      `SELECT id, advertiser, image_key, position FROM ads WHERE status = 'active'
       AND start_date <= date('now') AND end_date >= date('now') AND click_url LIKE 'https://%'`).all<LiveAd>()).results);
