import { siteUrl } from '../lib/content';
import { getPages, getPosts, getSettings, topicsWithPosts } from '../lib/site';
import { abs, postMarkdownPath } from '../lib/seo';

// https://llmstxt.org — a Markdown map of the site for LLMs and AI agents. Links point at the
// plain-Markdown twin of each post.
export async function GET() {
  const site = siteUrl;
  const settings = await getSettings();
  const posts = await getPosts();
  const topics = await topicsWithPosts();
  const pages = await getPages();
  const one = (s: string) => s.replace(/\s+/g, ' ').trim();

  const body = [
    `# ${settings.siteName}`,
    '',
    `> ${one(settings.description)}`,
    '',
    ...topics.flatMap(({ topic, posts }) => [
      `## ${topic.data.name}`,
      '',
      ...(topic.data.description ? [one(topic.data.description), ''] : []),
      ...posts.map((p) => `- [${p.data.title}](${abs(postMarkdownPath(p), site)}): ${one(p.data.excerpt)}`),
      '',
    ]),
    ...(posts.some((p) => !p.data.topics.length)
      ? ['## Other posts', '', ...posts.filter((p) => !p.data.topics.length).map((p) => `- [${p.data.title}](${abs(postMarkdownPath(p), site)}): ${one(p.data.excerpt)}`), '']
      : []),
    '## About',
    '',
    ...pages.map((p) => `- [${p.data.title}](${abs(`/${p.id}/`, site)}): ${p.data.description}`),
    '',
    '## Optional',
    '',
    `- [Full text of all posts](${abs('/llms-full.txt', site)}): everything above in a single Markdown file`,
    `- [RSS feed](${abs('/rss.xml', site)}) · [JSON Feed](${abs('/feed.json', site)})`,
    `- [Sitemap](${abs('/sitemap.xml', site)})`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
