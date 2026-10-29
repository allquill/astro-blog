# Go-live checklist

## Before the first deploy

- [ ] **Site settings** in Keystatic: blog name, tagline, description, publisher, contact e-mail,
  social profiles, share buttons, subscribe text.
- [ ] **Content:** replace the sample posts, topics, authors and images (`website/src/content/`,
  `src/assets/`, `public/images/gallery/`, `public/logo.png`, `public/favicon.svg`).
- [ ] **Pages:** rewrite about, privacy and terms. Privacy matters most: you store subscriber e-mails and
  feedback (see [Engagement → Privacy notes](engagement.md#privacy-notes)).
- [ ] `docker/.env`:
  - `JWT_SECRET_KEY` from `openssl rand -hex 32`
  - `ADMIN_PASSWORD`
  - `PUBLIC_SITE_URL`, `ADMIN_URL`
  - SMTP settings, `MAIL_FROM`, `NOTIFY_TO`, `BLOG_NAME`
- [ ] **Mail delivery:** SPF, DKIM and DMARC for the `MAIL_FROM` domain, or confirm e-mails go to spam.
  Subscribe yourself and check the headers, including `List-Unsubscribe`.
- [ ] **Build argument:** `SITE_URL`, so the feed, and with it every e-mail link, points at the real
  domain.
- [ ] **Hostnames:** the admin on its own hostname, ideally behind Cloudflare Access or a VPN as well as
  its login. `CLIENT_IP_HEADER=cf-connecting-ip` behind Cloudflare.
- [ ] **Backups:** `docker/volumes/server/` (or the Postgres database). Test a restore.

## After the first deploy

- [ ] **First login:** log in to the admin, then remove `ADMIN_PASSWORD` from `docker/.env`.
- [ ] **The dashboard shows posts.** If it warns that the site feed can't be read, check
  `SITE_FEED_URL`.
- [ ] **Staff:** invite them (*Users*). The `staff` role can manage subscribers, feedback and draft
  e-mails; only admins send to the list, import and change settings.
- [ ] **Settings:** notification e-mails, welcome and thank-you e-mails, signature, and the
  **mailing-list footer** with your postal address.
- [ ] **Test the whole flow** from a phone:
  1. Like and share a post.
  2. Send feedback with an e-mail address, and reply from the admin.
  3. Subscribe, confirm, change topics, and unsubscribe with the mail client's button.
  4. Send a new-post e-mail test, then a real one to a list with only you on it.
- [ ] **Search:** submit `sitemap.xml` in Google Search Console. Set the IndexNow key in Site settings and
  run `pnpm run indexnow` after publishing.
- [ ] **Analytics:** if you use GA4, follow [Analytics](analytics.md): set the CI variable, turn off
  the duplicate Enhanced measurement events, mark `sign_up_confirmed` as a key event, and check
  Realtime with the banner accepted.
