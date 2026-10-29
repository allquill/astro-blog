# CLAUDE.md

A blog platform: static site with Keystatic CMS, admin app, and NestJS API for likes, shares, the
mailing list and feedback. It is modelled on `../service-portal` (same skeleton, auth, mail and
migration rules), but it is a separate product. Read `README.md` and `docs/` first.
`docs/engagement.md` is the reference for the reader-facing flows.

## Shape

Three **independent pnpm projects** (each has its own lockfile and settings-only
`pnpm-workspace.yaml`), with a root that only orchestrates. Run scripts from the root:

- `server/`: NestJS 11 + TypeORM (SQLite or Postgres), port 3002
- `admin/`: React 19 + Vite SPA, port 5175
- `website/`: Astro 7 + Keystatic, port 4322

`pnpm run dev` starts all three. There is no git repo yet.

## Verification

There are no tests. `pnpm run check` must pass:

- server: `tsc`
- admin: `tsc -b` and eslint with `--max-warnings 0` (currently 0)
- website: `astro check`, which also validates content

After touching entities, migrations or module wiring, **boot the API** and look for
`astro-blog-api listening`. Migrations run at start-up.

## Rules that are easy to break

- **Content lives in the website's files, not in the database.**
  - The API knows posts and topics only through the site's `/feed.json` (`SITE_FEED_URL`), cached for
    5 minutes (`server/src/feed/site-feed.service.ts`).
  - Slugs are the join key: `post_stats`, `feedback.post_slug`, `subscribers.topics` and digests all
    store Keystatic slugs.
  - Renaming a post or topic slug orphans its counters and subscriber preferences.
  - `website/src/pages/feed.json.ts` (its `_blog` extension) and `SiteFeedService` must change together.
- **`keystatic.config.ts`, `website/src/content.config.ts` and `website/markdoc.config.mjs` must change
  together.**
  - Body blocks (video, callout, gallery, linkcard) are Keystatic content components and Markdoc tags
    with the same attributes.
  - Code-block `title`/`highlight` are fence annotations, allowed through Keystatic's `codeBlock.schema`.
  - Keystatic stores body images in `src/assets/<posts|pages>/<slug>/`. An image elsewhere shows as raw
    text in the editor.
- **Schema changes are new migrations** in `server/src/database/migrations/`, added to `MIGRATIONS`.
  - Use the Table API so they run on both drivers.
  - Never edit a released migration.
  - Every entity goes in the single `ENTITIES` list.
  - Non-Create/Update timestamps are epoch-ms `bigint` columns with `asNumber`.
  - The process is pinned to UTC (`common/utc.ts`).
- **`admin/src/sdk` is generated.** After any endpoint or DTO change, run `pnpm run sdk`.
  - Declare every response with `@ApiOkResponse({ type })`, and query parameters as a DTO class or
    `@ApiQuery`, or they come out as `any` or go missing.
- **Admin routes are data:** one entry in `admin/src/app/routes.tsx`.
- **`docs/` is also served to staff** by docsify (admin → Docs, `server/src/docs/docs.module.ts`). The API
  image gets it through the named build context `docs`: a plain `docker build ./server` fails without
  `--build-context docs=./docs`. Keep list continuation lines indented by 2 spaces (docsify's parser).
- **Admin endpoints use `@Staff()` / `@Staff('admin')`.** That applies the JWT cookie, roles, the
  same-origin CSRF check and the Swagger annotations. Sending to the list, importing and deleting are
  `@Staff('admin')`.
- **Public endpoints** live under `/api/public`, use `PublicExceptionFilter`, and rate-limit writes with
  `@Limit('<name>')` (`common/ip-throttler.guard.ts`; a new limit goes in `THROTTLERS`).
  - Every form works as a no-JS post too, answered with a 303 back to the page.
  - They never reveal whether an e-mail address is subscribed, and never return subscriber e-mails,
    IP hashes or internal fields.
- **Reader links** (confirm, manage, unsubscribe) are HMACs of the subscriber id and `accessKey` with
  `JWT_SECRET_KEY` (`common/links.ts`). Never store or log a token. Confirming is a POST, never a GET.
- **E-mail is sent after saving and never holds up a public request.**
  - Digests are a background loop over `digest_deliveries` that resumes after a restart. A request only
    queues them.
  - Every list e-mail carries `List-Unsubscribe` and `List-Unsubscribe-Post`.

## Local environment

- `server/.env` comes from `server/env.example` (local development). `docker/.env` comes from
  `docker/env.example`, which repeats the API settings plus the compose ones: a new API setting goes in
  both templates.
- `docker/docker-compose.yml` runs prebuilt images; `docker/docker-compose-build.yml` builds them, taking
  every service from the first through `extends` and adding only `build` and a local image name. Change
  ports, volumes or healthchecks in `docker-compose.yml` only.
- `website/.env.development` points `SITE_URL` at `http://localhost:4322`, so links in the feed and
  e-mails work locally.
- Mailpit on `:1025` / `:8025` catches e-mail.
- The local SQLite database lives in `server/data/`. Delete it for a fresh start.
