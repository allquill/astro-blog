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
