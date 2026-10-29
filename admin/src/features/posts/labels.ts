/** Share networks as the site's ShareBar reports them. */
export const NETWORK_LABEL: Record<string, string> = {
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  reddit: 'Reddit',
  hackernews: 'Hacker News',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  copy: 'Copied link',
  native: 'Device share sheet',
};

/**
 * Keystatic runs next to the website in development only (`astro dev`), or wherever you host it in
 * GitHub mode (VITE_KEYSTATIC_URL). Unset outside development = no "Edit" links.
 */
export const KEYSTATIC_URL: string | null =
  (import.meta.env.VITE_KEYSTATIC_URL as string | undefined) || (import.meta.env.DEV ? 'http://localhost:4322/keystatic' : null);

export const editPostUrl = (slug: string) => (KEYSTATIC_URL ? `${KEYSTATIC_URL.replace(/\/$/, '')}/collection/posts/item/${encodeURIComponent(slug)}` : null);
