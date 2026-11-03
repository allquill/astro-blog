// Builders for the Markdoc the editor inserts. The tags and attributes are the site's (website/src/lib/markdoc.ts)
// and the API's (server/src/content/markdoc-schema.ts): change the three together.

/** A Markdoc string attribute value, quoted and escaped. */
const q = (v: string) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

const attrs = (a: Record<string, string | number | undefined | null>) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 0)
    .map(([k, v]) => `${k}=${typeof v === 'number' ? v : q(String(v))}`)
    .join(' ');

/** Uploaded images are referenced by their original URL; the site picks the right size. */
export const mediaUrl = (id: string) => `/api/public/media/${id}`;
export const thumbUrl = (id: string, width = 320) => `/api/public/media/${id}/${width}.webp`;

export const imageSnippet = (id: string, alt: string) => `![${alt.replace(/[[\]]/g, '')}](${mediaUrl(id)})`;

/** "2,4-6": comma-separated line numbers and ranges. */
export const HIGHLIGHT = /^\s*\d+(\s*-\s*\d+)?(\s*,\s*\d+(\s*-\s*\d+)?)*\s*$/;

export function codeSnippet(c: { content: string; language: string; title: string; highlight: string; source: string }) {
  const longest = Math.max(2, ...[...c.content.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(longest + 1);
  const a = attrs({ title: c.title.trim(), highlight: c.highlight.replace(/\s+/g, ''), source: c.source.trim() });
  return `${fence}${c.language.trim()}${a ? ` {% ${a} %}` : ''}\n${c.content.replace(/\n+$/, '')}\n${fence}`;
}

export const videoSnippet = (v: { provider: string; id: string; title: string; start: number }) =>
  `{% video ${attrs({ provider: v.provider, id: v.id.trim(), title: v.title.trim(), start: v.start || undefined })} /%}`;

export const calloutSnippet = (c: { type: string; title: string; text: string }) =>
  `{% callout ${attrs({ type: c.type, title: c.title.trim() })} %}\n${c.text.trim() || 'Text of the note.'}\n{% /callout %}`;

export const linkcardSnippet = (l: { url: string; title: string; description: string }) =>
  `{% linkcard ${attrs({ url: l.url.trim(), title: l.title.trim(), description: l.description.trim() })} /%}`;

export function gallerySnippet(images: { id: string; alt: string; caption: string }[], columns: '2' | '3') {
  const list = images.map((i) => `{src: ${q(mediaUrl(i.id))}, alt: ${q(i.alt)}${i.caption ? `, caption: ${q(i.caption)}` : ''}}`).join(', ');
  return `{% gallery images=[${list}] columns=${q(columns)} /%}`;
}

export const LANGUAGES = [
  'ts', 'tsx', 'js', 'jsx', 'json', 'bash', 'sh', 'yaml', 'toml', 'html', 'css', 'scss', 'astro', 'vue', 'svelte', 'md', 'mdx',
  'python', 'go', 'rust', 'java', 'kotlin', 'swift', 'c', 'cpp', 'csharp', 'php', 'ruby', 'sql', 'graphql', 'docker', 'diff', 'text',
];
