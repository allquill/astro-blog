import { getSettings } from '../lib/site';
import { brandPalette, markSvg } from '../lib/brand';

// The site's mark in its brand colour (admin → Site): the browser-tab icon and the header logo's source.
// public/favicon.svg stays as the fixed teal fallback (crawlers asking for /favicon.svg, the Docker healthcheck).
export async function GET() {
  const { brandColor } = await getSettings();
  return new Response(markSvg(brandPalette(brandColor)[700]), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
