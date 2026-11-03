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

import type { Tone } from '@/shared/ui';

/** Post statuses as the admin shows them (scheduled = published with a future date). */
export const STATUS_TONE: Record<string, Tone> = { draft: 'amber', published: 'emerald', scheduled: 'sky' };
export const STATUS_LABEL: Record<string, string> = { draft: 'Draft', published: 'Published', scheduled: 'Scheduled' };

/** Download URL of one post (.md, or .zip when it has images). A plain link: the browser saves the file. */
export const postExportUrl = (id: number) => `/api/admin/content/posts/${id}/export`;
