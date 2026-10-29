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
pnpm run dev       # API :3002, admin :5175, website :4322
```

## A quick tour

1. **http://localhost:4322**: the blog. Open a post to see highlighted code, the video and gallery
   blocks, the table of contents, like and share buttons, "Was this helpful?", and the subscribe box.
2. **Subscribe** with any address, then open Mailpit (http://localhost:8025) and click the confirm
   link. The manage page lets you pick topics or unsubscribe.
3. **http://localhost:4322/keystatic**: write a post. Pick topics and an author, add a code block
   (language, title and highlighted lines are in the block's settings), insert a Video or Gallery from
   the **+** menu. Save, and the dev site shows it immediately.
4. **http://localhost:5175**: the admin. The dashboard and **Posts** show the like, share and feedback
   numbers. In **Posts**, click **E-mail** on a post to draft a new-post e-mail. Preview it, send
   yourself a test, then send it to the list.
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
    src/dashboard/        admin dashboard + posts-with-numbers
    src/feed/             reads the website's /feed.json
    src/mail/             e-mail templates (React → static HTML) and sending
    src/settings/         runtime settings edited in the admin
    src/database/         entity list, migrations
  admin/                  React admin SPA (src/sdk is generated)
  website/                Astro site + Keystatic
    keystatic.config.ts   the CMS schema
    markdoc.config.mjs    how post bodies render (code, video, callout, gallery, linkcard)
    src/content/          posts, topics, authors, pages, settings.yaml, home.yaml
    src/components/       layout, widgets (ShareBar, LikeButton, FeedbackWidget, SubscribeForm), content/
    src/pages/            routes, feeds, sitemap, llms.txt
```

## How the pieces talk

```
 browser ──► website (static files, nginx) ──/api/public──► server ◄──/api/admin── admin SPA
                   ▲                                          │
                   └────────────── GET /feed.json ────────────┘
```

- The **website** is static. Its widgets call `/api/public/*` on the same origin. In dev that goes
  through Astro's Vite proxy; in Docker, through nginx.
- The **server** reads the website's `/feed.json` to learn which posts and topics exist. Engagement for
  unknown slugs is refused. Digests are built from the feed entry.
- The **admin** talks to `/api/admin/*` with an HttpOnly cookie, through its own Vite proxy or nginx.
