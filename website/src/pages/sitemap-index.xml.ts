import { siteUrl } from '../lib/content';
import { getSettings } from '../lib/site';
import { getSiteUrls, sitemapIndexResponse } from '../lib/seo';

// The sitemap index: posts (with their images) and every other page, in separate sitemaps.
export async function GET() {
  return sitemapIndexResponse(await getSiteUrls(await getSettings()), siteUrl);
}
