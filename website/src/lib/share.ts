// Share networks offered by the post page's ShareBar. Keys are what the API counts
// (server/src/engagement/engagement.entities.ts SHARE_NETWORKS) and what Settings → Share buttons lists.

export const SHARE_NETWORKS = {
  x: { label: 'X', icon: 'xLogo', url: (u: string, t: string) => `https://x.com/intent/post?url=${u}&text=${t}` },
  linkedin: { label: 'LinkedIn', icon: 'linkedin', url: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  facebook: { label: 'Facebook', icon: 'facebook', url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  reddit: { label: 'Reddit', icon: 'message', url: (u: string, t: string) => `https://www.reddit.com/submit?url=${u}&title=${t}` },
  hackernews: { label: 'Hacker News', icon: 'code', url: (u: string, t: string) => `https://news.ycombinator.com/submitlink?u=${u}&t=${t}` },
  bluesky: { label: 'Bluesky', icon: 'cloud', url: (u: string, t: string) => `https://bsky.app/intent/compose?text=${t}%20${u}` },
  mastodon: { label: 'Mastodon', icon: 'message', url: (u: string, t: string) => `https://mastodonshare.com/?url=${u}&text=${t}` },
  whatsapp: { label: 'WhatsApp', icon: 'send', url: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}` },
  email: { label: 'E-mail', icon: 'mail', url: (u: string, t: string) => `mailto:?subject=${t}&body=${u}` },
} as const;

export type ShareNetwork = keyof typeof SHARE_NETWORKS;
export const SHARE_NETWORK_KEYS = Object.keys(SHARE_NETWORKS) as [ShareNetwork, ...ShareNetwork[]];
export const DEFAULT_SHARE: ShareNetwork[] = ['x', 'linkedin', 'reddit', 'hackernews', 'bluesky', 'email'];

/** Social profiles in the footer and on author pages. */
export const SOCIAL_NETWORKS = {
  github: { label: 'GitHub', icon: 'github' },
  x: { label: 'X', icon: 'xLogo' },
  linkedin: { label: 'LinkedIn', icon: 'linkedin' },
  mastodon: { label: 'Mastodon', icon: 'message' },
  bluesky: { label: 'Bluesky', icon: 'cloud' },
  youtube: { label: 'YouTube', icon: 'play' },
  website: { label: 'Website', icon: 'globe' },
} as const;
export type SocialNetwork = keyof typeof SOCIAL_NETWORKS;
export const SOCIAL_NETWORK_KEYS = Object.keys(SOCIAL_NETWORKS) as [SocialNetwork, ...SocialNetwork[]];
