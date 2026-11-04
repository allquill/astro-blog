# SEO and search engines

How the blog presents itself to search engines, what you set yourself, and how to connect it to
**Google Search Console** and **Bing Webmaster Tools**. For writing posts and pages that rank, see
[Writing for search](content-guide.md#writing-for-search) in the Content guide and
[Make a post search-friendly](content-how-to.md#make-a-post-search-friendly).

## What the site does by itself

You don't need a plugin or a build step for any of this. Every page is rendered from the current
content, so a change shows within seconds.

- **Sitemaps**
  - `/sitemap-index.xml` points at `/sitemap-posts.xml` (every post, with its cover and body images)
    and `/sitemap-pages.xml` (home, blog pages, topics, tags, authors, pages, subscribe, feedback).
  - `/sitemap.xml` lists the same URLs in one file, for tools that want a single sitemap.
  - Each entry carries the date of its last change (a post's **Updated on**, else its date).
  - Drafts, scheduled posts, posts marked **Hide from search engines** and posts with a **Canonical URL**
    on another site are never listed.
- **`/robots.txt`** allows every crawler (AI search bots included), keeps the API and the personal
  subscription pages out, and names both sitemaps.
- **One URL per page.** `/blog/my-post` redirects (301) to `/blog/my-post/`, and every page names that
  address as its canonical URL.
- **Titles and descriptions.** `<title>` is `<post title> · <blog name>`, and the meta description is
  the excerpt. A post's **SEO title** and **Meta description** replace them when set.
- **Share previews** (Open Graph and X cards) use the cover image. A post without a cover gets a
  generated 1200×630 card with its title, the blog name and the author, in the brand colour.
- **Structured data** (JSON-LD) describes the blog, the publisher, each post as a `BlogPosting` (author,
  dates, image, topics, tags, embedded videos), breadcrumbs, and author profile pages.
- **Feeds:** `/rss.xml`, `/feed.json`, an RSS feed per topic, and `llms.txt` plus a Markdown copy of
  each post (`/blog/<slug>.md`) for AI assistants.
- **Never indexed:** previews, search results, the 404 page, the subscription pages and the API.

## Before you start

**`PUBLIC_SITE_URL` must be the exact public address** (`docker/.env`), for example
`https://www.example.com`. Canonical links, sitemaps and share images are all built from it.

- Use `https://`.
- Pick `www.` or no `www.` and stay with it. Redirect the other host to it at your proxy or DNS
  provider. The search-engine property you create below must use the same host.
- Check it: open `https://<your site>/robots.txt` and `https://<your site>/sitemap-index.xml`. Every
  URL in them must start with your public address, not `localhost`.

Then fill in **Site** in the admin (admins only):

- **Blog name** and **Description**: the home page's title and meta description. Write the
  description as one or two plain sentences saying what the blog is about and who it's for.
- **Publisher**, **Contact e-mail** and **Social profiles**: used in the structured data, so search
  engines can tie the blog to you.

## Google Search Console

Search Console shows which searches find you, which pages are indexed and why others aren't.

### 1. Add and verify the site

1. Go to [search.google.com/search-console](https://search.google.com/search-console) and sign in with
   the Google account that should own the site.
2. **Add property** and choose a type:
  - **URL prefix** (the simplest): enter the exact public address, e.g. `https://www.example.com/`.
    It can be verified with the blog's meta tag (next step).
  - **Domain** covers every host and protocol, but can only be verified by a DNS TXT record at your
    domain registrar. Use it if you manage DNS. In that case skip steps 3 to 6.
3. Under **Other verification methods**, open **HTML tag**. Google shows a tag like
   `<meta name="google-site-verification" content="AbC123…xyz" />`.
4. Copy **only the `content` value** (`AbC123…xyz`, without the quotes).
5. In the admin, open **Site**, paste it into **Google Search Console verification** and press **Save
   site settings**. Every page now carries the tag.
6. Wait about 15 seconds, then press **Verify** in Search Console.

Leave the code in place: Google checks it again from time to time, and removing it unverifies the site.

### 2. Submit the sitemap

1. In Search Console, open **Sitemaps**.
2. Enter `sitemap-index.xml` and press **Submit**.
3. After a while the status shows **Success**, with the two sitemaps it lists and the number of URLs
   discovered.

You only submit it once. Google reads it again on its own, and new posts show up in it automatically.

### 3. Check that it works

- **URL inspection** (search bar at the top): paste a post's URL. **URL is on Google** means it is
  indexed. For a new post, press **Request indexing** to speed things up.
- **Pages** (under Indexing) lists what is indexed and why other pages aren't. Expected reasons
  include:
  - "Excluded by 'noindex' tag": search, previews, subscription pages and hidden posts.
  - "Page with redirect": the address without a trailing slash.
  - "Alternate page with proper canonical tag": posts with a canonical URL on another site.
- **Enhancements**: [Rich Results Test](https://search.google.com/test/rich-results) on a post URL
  should find a valid *Article* and *Breadcrumbs*.
- **Performance** shows searches, clicks and positions once data comes in, usually after a few days.

## Bing Webmaster Tools

Bing's index also feeds DuckDuckGo, Yahoo, Ecosia, Copilot and ChatGPT search, so it's worth the five
minutes.

### 1. Add and verify the site

The quickest way is **Import from Google Search Console** once Google is verified:

1. Go to [bing.com/webmasters](https://www.bing.com/webmasters) and sign in.
2. Choose **Import** under *Import your sites from GSC*, allow access, and select the site. Bing
   verifies it and copies the submitted sitemaps.

Or add it by hand with the meta tag:

1. **Add a site manually**, enter the public address, and choose **HTML Meta Tag**. Bing shows
   `<meta name="msvalidate.01" content="0123ABCD…" />`.
2. Copy **only the `content` value**, paste it into **Bing Webmaster verification** under **Site**
   in the admin, and save.
3. Wait about 15 seconds and press **Verify**.

### 2. Submit the sitemap

**Sitemaps → Submit sitemap**, enter `https://<your site>/sitemap-index.xml`. With an import from
Google it is usually already there.

### 3. IndexNow: tell Bing about changes straight away

[IndexNow](https://www.indexnow.org) lets the site tell Bing (and Yandex, Seznam, Naver) right away
that pages changed, instead of waiting for a crawl.

1. Make up a key of 8 to 128 letters, digits or dashes, e.g. from `uuidgen` or a password generator.
2. Paste it into **IndexNow key** under **Site** and save. The site then serves it at
   `https://<your site>/<key>.txt`, which is how the search engines check that pings are yours.
3. After publishing or changing posts, a developer runs the command below from the repository root.

```bash
pnpm run indexnow https://www.example.com --dry-run   # what would be sent
pnpm run indexnow https://www.example.com             # submit every URL in the sitemap
```

It is safe to run often. Pings for unchanged pages are simply ignored.

**URL Inspection** and **Site Explorer** in Bing Webmaster Tools then show what Bing has indexed.

## Other search engines

- **Yandex** and **Naver** take IndexNow pings (above) and have their own webmaster tools if you need
  their reports. They aren't wired into the admin. Verify them with their DNS or file methods.
- **DuckDuckGo, Yahoo and Ecosia** use Bing's index: nothing else to do.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Verification fails | The code wasn't saved, a full `<meta …>` tag was pasted instead of only the `content` value, or the property's host (`www.` or not, `https`) differs from `PUBLIC_SITE_URL`. View the home page source and search for `google-site-verification` / `msvalidate.01` |
| Sitemap URLs start with `localhost` | `PUBLIC_SITE_URL` isn't set in `docker/.env`; set it and restart the stack |
| "Couldn't fetch" for the sitemap | The site isn't reachable from the internet at that address, or a proxy in front blocks it |
| A post isn't in the sitemap | It's a draft, scheduled for later, marked **Hide from search engines**, or has a **Canonical URL** on another site |
| A post doesn't appear in Google | New sites take days to weeks. Use **URL inspection → Request indexing**, link to the post from other pages, and check **Pages** for the reason |
| Share preview shows an old image | Social networks cache previews. Re-scrape with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or LinkedIn's [Post Inspector](https://www.linkedin.com/post-inspector/) |
