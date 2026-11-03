# CLAUDE.md

A blog platform: an Astro site rendered on request, an admin app where all content is written, and a
NestJS API that stores the content and handles likes, shares, the mailing list and feedback. It is
modelled on `../service-portal` (same skeleton, auth, mail and migration rules), but it is a separate
product. Read `README.md` and `docs/` first.
`docs/engagement.md` is the reference for the reader-facing flows.

## Shape

Three **independent pnpm projects** (each has its own lockfile and settings-only
`pnpm-workspace.yaml`), with a root that only orchestrates. Run scripts from the root:

- `server/`: NestJS 11 + TypeORM (SQLite or Postgres), port 3002
- `admin/`: React 19 + Vite SPA, port 5175
- `website/`: Astro 7, server-rendered (`@astrojs/node`), port 4322. Docker: two images from one
  Dockerfile, `edge` (nginx, service `website`) and `ssr` (Node, service `web`)

`pnpm run dev` starts all three.

## Verification

There are no tests. `pnpm run check` must pass:

- server: `tsc`
- admin: `tsc -b` and eslint with `--max-warnings 0` (currently 0)
- website: `astro check`

After touching entities, migrations or module wiring, **boot the API** and look for
`astro-blog-api listening`. Migrations run at start-up. Check new queries on Postgres as well as SQLite.
`pnpm run content:import -- seed/content.zip` (from the root; paths relative to `server/`) loads sample
content into an empty database.

## Rules that are easy to break

- **Content lives in the API's database** (`server/src/content/`), edited in the admin. Nothing is
  built from it: the site renders from a snapshot (`GET /api/public/content/snapshot`) that it
  refetches when `/version` changes (`website/src/lib/content.ts`).
  - Every content write must call `ContentService.touch()`, or the site won't notice it. A post
    whose date arrives changes `version` by itself.
  - Slugs are the join key: `post_stats`, `feedback.post_slug`, `subscribers.topics` and digests all
    store them. A post's slug is locked once published; topic and author slugs never change; a topic
    or author still used by a post can't be deleted.
  - `SiteFeedService` keeps the shape it had when it read `/feed.json`; the rest of the API uses it
    for "published posts".
  - The snapshot is public: never put internal fields in `Public*Dto`.
- **The Markdoc schema exists three times and must change together:**
  `server/src/content/markdoc-schema.ts` (validated on save and import), `website/src/lib/markdoc.ts`
  (rendered, mapped to `components/content/*` by `components/MarkdocContent.astro`) and
  `admin/src/features/editor/markdoc.ts` (what the toolbar inserts).
  - Code-block `title`/`highlight`/`source` are fence annotations.
  - Uploaded images are referenced as `/api/public/media/<id>`; the site and the export rewrite them.
- **Option lists exist three times too:** icons, accents, social and share networks in
  `server/src/content/content.constants.ts`, `website/src/lib/{icons,accents,share}.ts` and
  `admin/src/features/editor/options.ts`.
- **Import/export** (`server/src/content/transfer/`) is the backup and migration format: a change to a
  content field goes into `importX`, the export and `docs/content-guide.md`. Zip entries go through
  `safePath`; imported images through `MediaService.save`.
- **Server-side fetches of user-given URLs** go through `CodeFetchService` (https only, resolved
  address checked against private ranges and pinned, size and time caps). Never `fetch()` one directly.
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
  same-origin CSRF check and the Swagger annotations. Sending to the list, importing, deleting and
  changing site settings are `@Staff('admin')`; writing and publishing content is `@Staff()`.
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
- The website reads `SITE_URL`, `API_INTERNAL_URL`, `CONTENT_POLL_MS` and `GA_MEASUREMENT_ID` at
  runtime (`astro:env`, access `secret`). In Docker `SITE_URL` comes from `PUBLIC_SITE_URL`, so the
  API and the site always agree. `website/.env.development` sets it to `http://localhost:4322`.
- Uploaded images live in `MEDIA_DIR` (`server/data/media/` locally, `/data/media` in Docker).
- Mailpit on `:1025` / `:8025` catches e-mail.
- The local SQLite database and images live in `server/data/`. Delete it for a fresh start.
