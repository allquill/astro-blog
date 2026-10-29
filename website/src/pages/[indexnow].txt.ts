import { getSettings } from '../lib/site';

// IndexNow key file (https://www.indexnow.org): /<key>.txt must contain the key, proving that
// `pnpm run indexnow` pings are sent by the site owner. Not generated when no key is set.
export async function getStaticPaths() {
  const { indexNowKey } = await getSettings();
  return indexNowKey ? [{ params: { indexnow: indexNowKey } }] : [];
}

export async function GET() {
  const { indexNowKey } = await getSettings();
  return new Response(indexNowKey, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
