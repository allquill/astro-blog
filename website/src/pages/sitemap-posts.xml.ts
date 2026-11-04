import { siteUrl } from '../lib/content';
import { getSettings } from '../lib/site';
import { getSiteUrls, urlsetResponse } from '../lib/seo';

// Indexable posts with their cover and body images (listed by /sitemap-index.xml).
export async function GET() {
  const urls = await getSiteUrls(await getSettings());
  return urlsetResponse(urls.filter((u) => u.kind === 'post'), siteUrl);
}
