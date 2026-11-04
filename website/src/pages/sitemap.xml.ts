import { siteUrl } from '../lib/content';
import { getSettings } from '../lib/site';
import { getSiteUrls, urlsetResponse } from '../lib/seo';

// Every indexable URL in one file. Kept beside the sitemap index (/sitemap-index.xml) because
// existing Search Console entries and the IndexNow script read it.
export async function GET() {
  return urlsetResponse(await getSiteUrls(await getSettings()), siteUrl);
}
