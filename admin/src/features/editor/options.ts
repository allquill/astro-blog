// Choices the content forms offer. The API validates against the same lists
// (server/src/content/content.constants.ts) and the site renders them (website/src/lib/): change all together.

export const CONTENT_ICONS = [
  'book', 'code', 'terminal', 'rocket', 'database', 'cloud', 'cpu', 'layers', 'globe', 'pen',
  'lightbulb', 'shield', 'sparkles', 'users', 'camera', 'calendar', 'clock', 'zap',
] as const;

export const ACCENTS: Record<string, string> = {
  teal: 'bg-teal-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-500',
};

export const SOCIAL_NETWORKS: Record<string, string> = {
  github: 'GitHub', x: 'X', linkedin: 'LinkedIn', mastodon: 'Mastodon', bluesky: 'Bluesky', youtube: 'YouTube', website: 'Website',
};

export const SHARE_NETWORKS: Record<string, string> = {
  x: 'X', linkedin: 'LinkedIn', facebook: 'Facebook', reddit: 'Reddit', hackernews: 'Hacker News', bluesky: 'Bluesky',
  mastodon: 'Mastodon', whatsapp: 'WhatsApp', email: 'E-mail',
};

/**
 * The site's brand colour (admin → Site): a Tailwind colour family. Shades are its 100, 600 and 700
 * (Tailwind 4.3.3 as hex) for the swatches and the preview; the full scales are in website/src/lib/brand.ts.
 */
export const BRAND_COLORS: Record<string, { label: string; shades: [light: string, main: string, dark: string] }> = {
  red: { label: 'Red', shades: ['#ffe2e2', '#e7000b', '#c10007'] },
  orange: { label: 'Orange', shades: ['#ffedd4', '#f54900', '#ca3500'] },
  amber: { label: 'Amber', shades: ['#fef3c6', '#e17100', '#bb4d00'] },
  yellow: { label: 'Yellow', shades: ['#fef9c2', '#d08700', '#a65f00'] },
  lime: { label: 'Lime', shades: ['#ecfcca', '#5ea500', '#497d00'] },
  green: { label: 'Green', shades: ['#dcfce7', '#00a63e', '#008236'] },
  emerald: { label: 'Emerald', shades: ['#d0fae5', '#009966', '#007a55'] },
  teal: { label: 'Teal', shades: ['#cbfbf1', '#009689', '#00786f'] },
  cyan: { label: 'Cyan', shades: ['#cefafe', '#0092b8', '#007595'] },
  sky: { label: 'Sky', shades: ['#dff2fe', '#0084d1', '#0069a8'] },
  blue: { label: 'Blue', shades: ['#dbeafe', '#155dfc', '#1447e6'] },
  indigo: { label: 'Indigo', shades: ['#e0e7ff', '#4f39f6', '#432dd7'] },
  violet: { label: 'Violet', shades: ['#ede9fe', '#7f22fe', '#7008e7'] },
  purple: { label: 'Purple', shades: ['#f3e8ff', '#9810fa', '#8200db'] },
  fuchsia: { label: 'Fuchsia', shades: ['#fae8ff', '#c800de', '#a800b7'] },
  pink: { label: 'Pink', shades: ['#fce7f3', '#e60076', '#c6005c'] },
  rose: { label: 'Rose', shades: ['#ffe4e6', '#ec003f', '#c70036'] },
  slate: { label: 'Slate', shades: ['#f1f5f9', '#45556c', '#314158'] },
  gray: { label: 'Gray', shades: ['#f3f4f6', '#4a5565', '#364153'] },
  zinc: { label: 'Zinc', shades: ['#f4f4f5', '#52525c', '#3f3f46'] },
  neutral: { label: 'Neutral', shades: ['#f5f5f5', '#525252', '#404040'] },
  stone: { label: 'Stone', shades: ['#f5f5f4', '#57534d', '#44403b'] },
};

/** The suggested themes, each a brand colour family. */
export const BRAND_PRESETS: { id: string; label: string; color: string }[] = [
  { id: 'default', label: 'Default', color: 'teal' },
  { id: 'purple', label: 'Purple', color: 'purple' },
  { id: 'blue', label: 'Blue', color: 'blue' },
  { id: 'pink', label: 'Pink', color: 'pink' },
  { id: 'green', label: 'Green', color: 'green' },
];
