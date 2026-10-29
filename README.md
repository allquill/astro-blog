# astro-blog

An end-to-end **blog platform**. Authors write posts in a CMS, with topics, highlighted code, videos,
images, galleries, callouts and link cards. Readers can like and share posts, subscribe to new-post
e-mails and send feedback. Staff run the mailing list and the feedback inbox from an admin app.

It is built like `../service-portal`: an Astro + Keystatic static site, a React admin app and a NestJS
API. The repository holds three independent pnpm projects:

| Folder | What it is | Image |
|---|---|---|
| `website/` | Astro 7 static site + Keystatic CMS (dev only): posts, topics, tags, authors, pages, search, RSS/JSON feeds, and the like/share/subscribe/feedback widgets | `astro-blog-web` (nginx) |
| `admin/` | React 19 + Vite admin SPA: dashboard, posts and their numbers, subscribers, feedback inbox, new-post e-mails, users, settings | `astro-blog-admin` (nginx) |
| `server/` | NestJS 11 API + TypeORM (SQLite or Postgres): likes, share counts, mailing list, feedback, digests, admin auth | `astro-blog-api` |

The root `package.json` only orchestrates them. It also holds the release version that CI bumps.

## What it does

- **Writing.** Posts, topics, authors and pages are files edited in Keystatic (`/keystatic` under
  `pnpm run dev`, or a hosted Keystatic in GitHub mode). The editor has:
  - code blocks with a language, an optional title and highlighted lines, rendered with Shiki
    (light and dark themes) and a copy button
  - images, optimised to responsive WebP
  - blocks for **video** (YouTube/Vimeo, loaded only on click, or a file), **gallery**, **callout** and
    **link card**
  - drafts, featured posts, series, tags, cover images and canonical URLs
- **Reading.** Pages include the home page, the blog with pagination, topic, tag and author pages, a post
  page with a table of contents, reading time, series navigation, related posts and newer/older links,
  plus client-side search. Feeds: RSS for the site and for each topic, JSON Feed, sitemap, `llms.txt`
  and Markdown twins of posts. There is structured data, and light and dark themes.
- **Engagement.**
  - **Likes:** one per visitor, counted by a salted hash and never a raw IP.
  - **Share buttons:** X, LinkedIn, Facebook, Reddit, HN, Bluesky, Mastodon, WhatsApp, e-mail, the
    device share sheet and copy link. Clicks are counted.
  - **"Was this helpful?"** with an optional message, and a general feedback page.
- **Mailing list.**
  - Double opt-in. The confirm step is a button, so link scanners can't subscribe anyone.
  - Topic preferences and a manage page.
  - **One-click unsubscribe** (RFC 8058 `List-Unsubscribe-Post`).
  - CSV import and export.
  - **New-post e-mails** go to the subscribers who follow the post's topics, sent in batches in the
    background, with a record per recipient.
- **Admin.**
  - A dashboard with subscribers per week, likes and feedback per day, shares by network and top posts.
  - Per-post likes, shares and helpful ratio.
  - A feedback inbox with replies by e-mail.
  - Users with admin/staff roles, invited by e-mail, and settings.
- **Analytics:** GA4 with a consent banner (Consent Mode v2). It records page views and events such as
  `share`, `like`, `sign_up`, `search`, `scroll`, `video_start` and `copy_code` (see
  [Analytics](docs/analytics.md)).

The site stays fully static: everything works without the API except the widgets, which hide or fall
back to plain form posts.

## Quick start

You need Node 22.12+ and pnpm 11 (run `corepack enable` once).

```bash
pnpm run setup                           # installs the root, server/, admin/ and website/
cp server/env.example server/.env       # set JWT_SECRET_KEY (openssl rand -hex 32) and ADMIN_PASSWORD
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit   # catch e-mails at http://localhost:8025
pnpm run dev                             # API :3002, admin :5175, website :4322 — Ctrl+C stops all three
```

| Address | What it is |
|---|---|
| http://localhost:4322 | The blog |
| http://localhost:4322/keystatic | The CMS |
| http://localhost:5175 | The admin. Log in as `admin` with your `ADMIN_PASSWORD` |
| http://localhost:5175/docs | These guides (docsify), for signed-in staff only |
| http://localhost:3002/api/docs | Swagger |

The API creates its SQLite database (`server/data/`) and runs its migrations on first start. It learns
which posts and topics exist from the website's `/feed.json` (`SITE_FEED_URL`).

## Documentation

The guides are plain Markdown in `docs/`. Staff can also read them in the admin, under **Docs**: the API
serves `docs/` with docsify at `/api/admin/docs/`, behind the admin sign-in, so they are never public.

| Guide | Covers |
|---|---|
| [Getting started](docs/getting-started.md) | Setup, the tour, project layout, how the pieces talk |
| [Content guide](docs/content-guide.md) | Keystatic: posts, code blocks, videos, galleries, topics, authors, pages, settings; GitHub mode |
| [Engagement](docs/engagement.md) | Likes, shares, feedback, the mailing list, new-post e-mails, privacy |
| [Analytics](docs/analytics.md) | Setting up GA4 so tracking works: property, build ID, stream settings, events, checking it |
| [Development](docs/development.md) | Architecture, adding an API endpoint, the generated admin client, migrations, checks |
| [Build and deploy](docs/build-and-deploy.md) | Images, Docker Compose, Postgres, hostnames, CI/CD and releases |
| [Go-live checklist](docs/go-live-checklist.md) | Before and after the first production deploy |

## Scripts (run from the root)

| Script | What it does |
|---|---|
| `pnpm run setup` | Install all four projects |
| `pnpm run dev` | API + admin + website together. `dev:api`, `dev:admin` and `dev:web` start one |
| `pnpm run check` | Type-check the API; type-check and lint the admin (0 warnings); `astro check` the site (validates all content) |
| `pnpm run build` | Build all three (the website build also runs the sitemap guard) |
| `pnpm run sdk` | Rebuild the API, dump its OpenAPI document to `admin/openapi.json` and regenerate `admin/src/sdk` |
| `pnpm run docker:build` | Build the three images |
| `pnpm run compose:up` / `compose:down` / `compose:logs` | Docker Compose (`docker/docker-compose.yml`) from this checkout |
| `pnpm --dir server run admin:set-password <user>` | Create an admin, or reset a password (lock-out recovery) |
