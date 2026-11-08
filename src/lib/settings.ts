import type { D1 } from './db';

export const SETTING_KEYS = [
  'site_name', 'motto', 'tagline_sub', 'edition', 'editor_name', 'contact_email', 'phone', 'address',
  'grievance_name', 'grievance_address', 'footer_text', 'social_facebook', 'social_instagram', 'social_youtube',
  'social_x', 'social_whatsapp', 'seo_description', 'seo_og_image', 'google_verification', 'epaper_retention_months',
] as const;
export type Settings = Record<(typeof SETTING_KEYS)[number], string>;

const DEFAULTS: Settings = {
  site_name: 'NEWS24 SHIVNERI', motto: 'निर्भिड सत्याचा बुलंद आवाज', tagline_sub: 'मराठी डिजिटल वृत्तपत्र',
  edition: 'स्थानिक आवृत्ती', editor_name: '[संपादकाचे नाव]', contact_email: '[ईमेल पत्ता]', phone: '[फोन नंबर]',
  address: '[कार्यालयाचा पत्ता], पुणे जिल्हा, महाराष्ट्र', grievance_name: '[तक्रार निवारण अधिकाऱ्याचे नाव]',
  grievance_address: '[तक्रार निवारण अधिकाऱ्याचा पत्ता]', footer_text: '© NEWS24 SHIVNERI. सर्व हक्क राखीव.',
  social_facebook: '', social_instagram: '', social_youtube: '', social_x: '', social_whatsapp: '',
  seo_description: 'NEWS24 SHIVNERI – पुणे जिल्ह्यातील विश्वासार्ह मराठी डिजिटल वृत्तपत्र. निर्भिड सत्याचा बुलंद आवाज.',
  seo_og_image: '/og-image.png', google_verification: '', epaper_retention_months: '12',
};

// One small read per render; memoised on locals so layouts and pages share it.
export async function getSettings(db: D1, locals?: any): Promise<Settings> {
  if (locals?._settings) return locals._settings;
  const { results } = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  const s = { ...DEFAULTS };
  for (const r of results) if (r.key in s) (s as any)[r.key] = r.value;
  if (locals) locals._settings = s;
  return s;
}

export async function saveSettings(db: D1, values: Partial<Settings>) {
  for (const [k, v] of Object.entries(values)) {
    if (!(SETTING_KEYS as readonly string[]).includes(k)) continue;
    await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind(k, String(v ?? '').trim().slice(0, 1000)).first();
  }
}
