#!/usr/bin/env node
/**
 * Tell IndexNow-enabled search engines (Bing — which also feeds ChatGPT search and Copilot —
 * Yandex, Seznam, Naver…) that the site's pages have changed. Run it AFTER a deploy:
 *
 *   pnpm run indexnow https://www.example.com            # submit every URL in the sitemap
 *   pnpm run indexnow https://www.example.com --dry-run  # print what would be sent
 *
 * The key is the site's IndexNow key (admin → Site settings), read from the live site's content API,
 * and the site serves it at /<key>.txt — that file is how the search engines verify the ping is yours.
 */

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const siteArg = args.find((a) => !a.startsWith('--')) ?? process.env.SITE_URL;

const fail = (msg) => {
  console.error(`indexnow: ${msg}`);
  process.exit(1);
};

if (!siteArg) fail('pass the live site URL, e.g. `pnpm run indexnow https://www.example.com`');
let site;
try {
  site = new URL(siteArg);
} catch {
  fail(`not a URL: ${siteArg}`);
}

const contentUrl = new URL('/api/public/content/snapshot', site).toString();
const contentRes = await fetch(contentUrl).catch((e) => fail(`cannot reach ${contentUrl}: ${e.message}`));
if (!contentRes.ok) fail(`${contentUrl} returned HTTP ${contentRes.status}`);
const key = (await contentRes.json())?.site?.indexNowKey;
if (!key) fail('no IndexNow key: set it in the admin → Site settings');

const keyLocation = new URL(`/${key}.txt`, site).toString();
const keyRes = await fetch(keyLocation).catch((e) => fail(`cannot reach ${keyLocation}: ${e.message}`));
if (!keyRes.ok || (await keyRes.text()).trim() !== key) {
  fail(`${keyLocation} does not serve the key (HTTP ${keyRes.status}). Is the site up to date?`);
}

const sitemapUrl = new URL('/sitemap.xml', site).toString();
const sitemapRes = await fetch(sitemapUrl).catch((e) => fail(`cannot reach ${sitemapUrl}: ${e.message}`));
if (!sitemapRes.ok) fail(`${sitemapUrl} returned HTTP ${sitemapRes.status}`);
const urlList = [...(await sitemapRes.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
if (urlList.length === 0) fail(`no <loc> entries in ${sitemapUrl}`);

const foreign = urlList.filter((u) => new URL(u).host !== site.host);
if (foreign.length) {
  fail(`the sitemap lists URLs on another host (${new URL(foreign[0]).host}). Is PUBLIC_SITE_URL set to ${site.origin}?`);
}

const payload = { host: site.host, key, keyLocation, urlList: urlList.slice(0, 10000) };
if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  console.log(`\n(dry run) would submit ${payload.urlList.length} URL(s) to https://api.indexnow.org/indexnow`);
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
// 200 = accepted, 202 = accepted, key validation pending.
if (res.status === 200 || res.status === 202) {
  console.log(`indexnow: submitted ${payload.urlList.length} URL(s) — HTTP ${res.status}`);
} else {
  fail(`IndexNow rejected the submission: HTTP ${res.status} ${await res.text()}`);
}
