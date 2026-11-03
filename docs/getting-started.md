# Getting started

## Prerequisites

- Node 22.12+ and pnpm 11 (`corepack enable`).
- Optional: Docker, for Mailpit (local e-mail) and for building images.

## Install and run

```bash
pnpm run setup
cp server/env.example server/.env
```

Edit `server/.env`:

- `JWT_SECRET_KEY`: any random 32+ characters (`openssl rand -hex 32`).
- `ADMIN_PASSWORD`: at least 12 characters. The first admin is created from it on first start; remove
  it afterwards.
- Leave SMTP pointing at Mailpit (`localhost:1025`) for local work:
  `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`.

```bash
pnpm run dev                                    # API :3002, admin :5175, website :4322
pnpm run content:import -- seed/content.zip     # optional: the sample posts, topics, authors and pages
```

The blog starts empty until you import the sample content or write a post. The site shows "Back in a
moment" while the API isn't running.

## A quick tour

1. **http://localhost:4322**: the blog. Open a post to see highlighted code, the video and gallery
   blocks, the table of contents, like and share buttons, "Was this helpful?", and the subscribe box.
2. **Subscribe** with any address, then open Mailpit (http://localhost:8025) and click the confirm
   link. The manage page lets you pick topics or unsubscribe.
3. **http://localhost:5175**: the admin. **Posts → New post**: give it a title, pick an author and
   topics, upload a cover. In the body, use the toolbar's code button to fetch a file from GitHub (with
   `#L10-L20` for a line range) and set highlighted lines, and insert a video, gallery or callout.
   **Preview**, then **Publish**: the post is on http://localhost:4322 within seconds.
4. The dashboard and **Posts** show the like, share and feedback numbers. In **Posts**, click
   **E-mail** on a published post to draft a new-post e-mail. Preview it, send yourself a test, then
   send it to the list.
5. **Feedback** shows messages from readers, and you can reply by e-mail.

## Layout

```
astro-blog/
  package.json            orchestration scripts + release version
  docker/                 docker-compose.yml (prebuilt images), docker-compose-build.yml (builds them),
                          env.example (website, admin, server; optional postgres, cloudflared, mailpit)
  docs/
  server/                 NestJS API
    src/auth/             admin users, JWT cookie, @Staff() guard, invites
    src/engagement/       likes, share counts (post_stats, post_likes)
    src/subscribers/      mailing list: double opt-in, manage, unsubscribe, import/export
    src/feedback/         votes + messages, admin inbox, replies
    src/digests/          new-post e-mails and their background sender
    src/content/          posts, topics, authors, pages, media, site settings; the snapshot the website
                          renders; Markdoc validation; code fetch; transfer/ (import and export)
    src/dashboard/        admin dashboard + posts-with-numbers
    src/feed/             published posts and topics for engagement, feedback and e-mails
    src/mail/             e-mail templates (React → static HTML) and sending
    src/settings/         runtime settings edited in the admin
    src/database/         entity list, migrations
    src/cli/              content import/export, set-password, openapi
    seed/content.zip      sample content
  admin/                  React admin SPA (src/sdk is generated)
    src/features/editor/  the Markdoc editor and its insert dialogs
  website/                Astro site, rendered on request (Node) behind nginx
    src/lib/content.ts    the API's content snapshot (polled for changes)
    src/lib/markdoc.ts    how post bodies render (code, image, video, callout, gallery, linkcard)
    src/components/       layout, widgets (ShareBar, LikeButton, FeedbackWidget, SubscribeForm), content/
    src/pages/            routes, feeds, sitemap, llms.txt, preview/
```

## How the pieces talk

```
 browser ──► website (nginx) ──pages──► web (Astro, Node) ──GET /api/public/content──► server ◄──/api/admin── admin SPA
                 │                                                                      ▲
                 └──────────────────── /api/public (forms, likes, images) ──────────────┘
```

- The **website** pages are rendered by `web` from one snapshot of the published content, which it
  refreshes when `GET /api/public/content/version` changes (polled every `CONTENT_POLL_MS`). nginx in
  front serves the built assets and keeps each page for 10 s. Widgets call `/api/public/*` on the same
  origin: in dev through Astro's Vite proxy, in Docker through nginx.
- The **server** owns the content. Engagement for slugs that aren't published posts is refused.
  Digests are built from the post as it is when sending starts.
- The **admin** talks to `/api/admin/*` with an HttpOnly cookie, through its own Vite proxy or nginx.
