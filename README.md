# astro-blog

An end-to-end **blog platform**. Authors write posts in the admin app, with topics, highlighted code
(pasted or fetched from GitHub), videos, images, galleries, callouts and link cards, and publish them
with one click: no commit, no build. Readers can like and share posts, subscribe to new-post e-mails
and send feedback. Staff run the mailing list and the feedback inbox from the same admin app.

It is built like `../service-portal`: an Astro site, a React admin app and a NestJS API, but the content
lives in the API's database and the site is rendered on request. The repository holds three
independent pnpm projects:

| Folder | What it is | Images |
|---|---|---|
| `website/` | Astro 7 site, rendered on request (`@astrojs/node`) from the API's content: posts, topics, tags, authors, pages, search, RSS/JSON feeds, and the like/share/subscribe/feedback widgets | `astro-blog-web` (nginx front door) + `astro-blog-web-ssr` (Node) |
| `admin/` | React 19 + Vite admin SPA: the post editor, topics, authors, pages, images, site settings, import/export, dashboard, subscribers, feedback inbox, new-post e-mails, users, settings | `astro-blog-admin` (nginx) |
| `server/` | NestJS 11 API + TypeORM (SQLite or Postgres): the content and uploaded images, likes, share counts, mailing list, feedback, digests, admin auth | `astro-blog-api` |

The root `package.json` only orchestrates them. It also holds the release version that CI bumps.

## What it does

- **Writing.** Posts, topics, authors, pages and site settings are edited in the admin and stored in
  the database (SQLite or Postgres). **Publish** shows a post on the site within seconds. The editor has:
  - code blocks with a language, a title, highlighted lines and a **"View on GitHub" source link**;
    the code can be pasted or **fetched from a GitHub/GitLab/Bitbucket link** (with a line range).
    Rendered with Shiki (light and dark themes) and a copy button
  - an image library with uploads, served as responsive WebP
  - blocks for **video** (YouTube/Vimeo, loaded only on click, or a file), **gallery**, **callout** and
    **link card**
  - drafts that save themselves, signed previews, scheduled posts, featured posts, series, tags, cover
    images and canonical URLs
  - **import and export** of single posts or the whole blog as Markdown + images (a `.zip`), with a
    dry run first
- **Reading.** Pages include the home page, the blog with pagination, topic, tag and author pages, a post
  page with a table of contents, reading time, series navigation, related posts and newer/older links,
  plus client-side search. Feeds: RSS for the site and for each topic, JSON Feed, a sitemap index (posts
  with images, and pages), `llms.txt` and Markdown twins of posts. There is structured data, per-post
  SEO title, description and noindex, generated share cards, and light and dark themes. Setting up Google and Bing: `docs/seo.md`.
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

The site renders from an in-memory copy of the published content and asks the API every few seconds
whether it changed, so it keeps serving pages if the API restarts.

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
| http://localhost:5175 | The admin, where content is written. Log in as `admin` with your `ADMIN_PASSWORD` |
| http://localhost:5175/docs | These guides (docsify), for signed-in staff only |
| http://localhost:3002/api/docs | Swagger |

The API creates its SQLite database (`server/data/`) and runs its migrations on first start. The blog
starts empty; load the sample posts with `pnpm run content:import -- seed/content.zip`.

## Documentation

The guides are plain Markdown in `docs/`. Staff can also read them in the admin, under **Docs**: the API
serves `docs/` with docsify at `/api/admin/docs/`, behind the admin sign-in, so they are never public.

| Guide | Covers |
|---|---|
| [Getting started](docs/getting-started.md) | Setup, the tour, project layout, how the pieces talk |
| [Content guide](docs/content-guide.md) | The admin editor: posts, code blocks (from GitHub), images, videos, galleries, topics, authors, pages, site settings; import and export |
| [Step by step](docs/content-how-to.md) | Walkthroughs: add a post or a page, a code snippet (pasted or from GitHub), a video, images and galleries, callouts and link cards |
| [Engagement](docs/engagement.md) | Likes, shares, feedback, the mailing list, new-post e-mails, privacy |
| [Analytics](docs/analytics.md) | Setting up GA4 so tracking works: property, measurement ID, stream settings, events, checking it |
| [Development](docs/development.md) | Architecture, adding an API endpoint, the generated admin client, migrations, checks |
| [Build and deploy](docs/build-and-deploy.md) | Images, Docker Compose, Postgres, hostnames, CI/CD and releases |
| [Go-live checklist](docs/go-live-checklist.md) | Before and after the first production deploy |

## Scripts (run from the root)

| Script | What it does |
|---|---|
| `pnpm run setup` | Install all four projects |
| `pnpm run dev` | API + admin + website together. `dev:api`, `dev:admin` and `dev:web` start one |
| `pnpm run check` | Type-check the API; type-check and lint the admin (0 warnings); `astro check` the site |
| `pnpm run build` | Build all three |
| `pnpm run sdk` | Rebuild the API, dump its OpenAPI document to `admin/openapi.json` and regenerate `admin/src/sdk` |
| `pnpm run docker:build` | Build the four images |
| `pnpm run content:import -- <zip\|md\|folder>` / `content:export -- <out.zip>` | Import or export content from the command line (paths relative to `server/`; see the content guide) |
| `pnpm run compose:up` | Docker Compose with the prebuilt images from the registry (`docker/docker-compose.yml`: pull, then start) |
| `pnpm run compose:build` | Docker Compose, building the four images from this checkout (`docker/docker-compose-build.yml`) |
| `pnpm run compose:down` / `compose:logs` | Stop, or follow the logs of, either one (they share one project) |
| `pnpm --dir server run admin:set-password <user>` | Create an admin, or reset a password (lock-out recovery) |
