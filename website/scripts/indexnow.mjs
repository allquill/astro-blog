#!/usr/bin/env node
/**
 * Tell IndexNow-enabled search engines (Bing — which also feeds ChatGPT search and Copilot —
 * Yandex, Seznam, Naver…) that the site's pages have changed. Run it AFTER a deploy:
 *
 *   pnpm run indexnow https://www.example.com            # submit every URL in the sitemap
 *   pnpm run indexnow https://www.example.com --dry-run  # print what would be sent
 *
 * The key comes from src/content/settings.yaml (`indexNowKey`) and must already be served by the
 * live site at /<key>.txt — that file is how the search engines verify the ping is yours.
 */
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

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

const { indexNowKey: key } = load(readFileSync(new URL('../src/content/settings.yaml', import.meta.url), 'utf8')) ?? {};
if (!key) fail('no indexNowKey in src/content/settings.yaml (set it in Keystatic → Site settings)');

const keyLocation = new URL(`/${key}.txt`, site).toString();
const keyRes = await fetch(keyLocation).catch((e) => fail(`cannot reach ${keyLocation}: ${e.message}`));
if (!keyRes.ok || (await keyRes.text()).trim() !== key) {
  fail(`${keyLocation} does not serve the key (HTTP ${keyRes.status}). Deploy the current build first.`);
}

const sitemapUrl = new URL('/sitemap.xml', site).toString();
const sitemapRes = await fetch(sitemapUrl).catch((e) => fail(`cannot reach ${sitemapUrl}: ${e.message}`));
if (!sitemapRes.ok) fail(`${sitemapUrl} returned HTTP ${sitemapRes.status}`);
const urlList = [...(await sitemapRes.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
if (urlList.length === 0) fail(`no <loc> entries in ${sitemapUrl}`);

const foreign = urlList.filter((u) => new URL(u).host !== site.host);
if (foreign.length) {
  fail(`the sitemap lists URLs on another host (${new URL(foreign[0]).host}). Was the image built with SITE_URL=${site.origin}?`);
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
