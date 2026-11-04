# Go-live checklist

## Before the first deploy

- [ ] **Site settings** in the admin (**Site**): blog name, tagline, description, publisher, contact
  e-mail, social profiles, share buttons, subscribe text, home page texts and the **brand colour**.
- [ ] **Content:** write your posts, topics and authors in the admin, or import them (**Posts →
  Import**). Don't import `seed/content.zip` in production, or delete the samples afterwards. The tab
  icon and header mark follow the brand colour, but `website/public/logo.png` (home-screen icon, link
  preview fallback) and the fallback `public/favicon.svg` are still teal files: replacing them is a
  rebuild.
- [ ] **Pages:** create about, privacy and terms (**Pages**). Privacy matters most: you store
  subscriber e-mails and feedback (see [Engagement → Privacy notes](engagement.md#privacy-notes)).
- [ ] `docker/.env` (from `docker/env.example`):
  - `JWT_SECRET_KEY` from `openssl rand -hex 32`
  - `ADMIN_PASSWORD`
  - `PUBLIC_SITE_URL`, `ADMIN_URL`
  - SMTP settings, `MAIL_FROM`, `NOTIFY_TO`, `BLOG_NAME`
- [ ] **Mail delivery:** SPF, DKIM and DMARC for the `MAIL_FROM` domain, or confirm e-mails go to spam.
  Subscribe yourself and check the headers, including `List-Unsubscribe`.
- [ ] **`PUBLIC_SITE_URL`** is the real public address: canonical links, the sitemap, feeds and every
  e-mail link come from it.
- [ ] **Hostnames:** the admin on its own hostname, ideally behind Cloudflare Access or a VPN as well as
  its login. `CLIENT_IP_HEADER=cf-connecting-ip` behind Cloudflare.
- [ ] **Backups:** `docker/volumes/server/` (the SQLite database and `media/`), or the Postgres
  database plus `media/`. They hold all the content. Test a restore. A periodic **Export all** is a
  second, portable copy.

## After the first deploy

- [ ] **First login:** log in to the admin, then remove `ADMIN_PASSWORD` from `docker/.env`.
- [ ] **Publish a test post** and check it appears on the site within seconds (if not, check that
  `web` reaches `server`: `docker compose logs web`). Then unpublish or delete it.
- [ ] **Staff:** invite them (*Users*). The `staff` role can write and publish content and manage
  subscribers, feedback and draft e-mails; only admins delete content, send to the list, import and
  change settings.
- [ ] **Settings:** notification e-mails, welcome and thank-you e-mails, signature, and the
  **mailing-list footer** with your postal address.
- [ ] **Test the whole flow** from a phone:
  1. Like and share a post.
  2. Send feedback with an e-mail address, and reply from the admin.
  3. Subscribe, confirm, change topics, and unsubscribe with the mail client's button.
  4. Send a new-post e-mail test, then a real one to a list with only you on it.
- [ ] **Search:** verify the site in Google Search Console and Bing Webmaster Tools (paste their
  verification codes in Site settings), then submit `sitemap-index.xml` in both. Step by step in
  [SEO and search engines](seo.md). Set the IndexNow key in
  Site settings and run `pnpm run indexnow` after publishing.
- [ ] **Analytics:** if you use GA4, follow [Analytics](analytics.md): set the CI variable, turn off
  the duplicate Enhanced measurement events, mark `sign_up_confirmed` as a key event, and check
  Realtime with the banner accepted.
