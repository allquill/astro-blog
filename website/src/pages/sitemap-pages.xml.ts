import { siteUrl } from '../lib/content';
import { getSettings } from '../lib/site';
import { getSiteUrls, urlsetResponse } from '../lib/seo';

// Everything except posts: home, lists, topics, tags, authors, pages (listed by /sitemap-index.xml).
export async function GET() {
  const urls = await getSiteUrls(await getSettings());
  return urlsetResponse(urls.filter((u) => u.kind === 'page'), siteUrl);
}
