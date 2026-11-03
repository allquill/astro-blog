import type { APIContext } from 'astro';
import { getSettings } from '../lib/site';

// IndexNow key file (https://www.indexnow.org): /<key>.txt must contain the key, proving that
// `pnpm run indexnow` pings are sent by the site owner. 404 for any other name, or when no key is set.
export async function GET({ params }: APIContext) {
  const { indexNowKey } = await getSettings();
  if (!indexNowKey || params.indexnow !== indexNowKey) return new Response(null, { status: 404 });
  return new Response(indexNowKey, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
