// One colour per section, so readers recognise sections at a glance. Unknown slugs use the brand red.
const COLORS: Record<string, string> = {
  crime: '#c4001f', politics: '#1f5aa8', agriculture: '#2f7d32', social: '#b8620e', education: '#6a3fb0',
  business: '#0e7c86', sports: '#0b7a4b', entertainment: '#b0306a', 'pune-district': '#8a0016',
};
export const catColor = (slug?: string | null) => (slug && COLORS[slug]) || '#c4001f';
export const catStyle = (slug?: string | null) => `--c:${catColor(slug)}`;
