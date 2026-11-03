# Development

## Checks

There are no automated tests. The verification loop is:

```bash
pnpm run check        # server tsc · admin tsc + eslint (0 warnings) · website astro check (types + content)
pnpm run build        # also runs the website's sitemap guard
```

**A build is not a boot.** After touching entities, migrations or module wiring, start the API
(`pnpm run dev:api`) and look for `astro-blog-api listening`. Migrations run at start-up, so a broken
one shows up there.

## Server

- **Modules** live under `server/src/<area>/` and are registered in `app.module.ts`. Controllers are
  split by audience:
  - `/api/public/*`: no auth, rate-limited where it writes. Errors take the site's shape,
    `{ ok: false, errors | error }`.
  - `/api/admin/*`: `@Staff()` for any signed-in user, or `@Staff('admin')` for admins only. Includes the
    JWT cookie, roles, the same-origin check and Swagger annotations.
  - `/api/auth/*`: login, logout, me, password, invites.
- **Validation** is global (`ValidationPipe`, whitelist). A failure becomes
  `{ message, errors: { field: message } }`, which the site and the admin both show next to the field.
- **Configuration** is validated at start-up (`config/env.validation.ts`); a missing setting stops the
  API with a list of what to fix. Runtime-editable options live in `blog_settings` instead (see
  `settings/settings.service.ts`, including the defaults).
- **E-mails** are React components in `mail/templates.tsx`, rendered to static HTML with inline styles.
  The plain-text versions sit next to each send in `mail/mail.service.ts`. Send after saving and never
  make a public request wait on SMTP (see `attempt()` in the subscribers and feedback services).
- **Rate limits** are named in `THROTTLERS` (`common/ip-throttler.guard.ts`): `engage`, `subscribe`,
  `feedback` and `login`. A route opts in with `@Limit('<name>')`, which applies that limit and skips
  the others. Visitors are tracked by a salted hash of the real client IP (`CLIENT_IP_HEADER`).
- **The site feed** (`feed/site-feed.service.ts`) is global; inject `SiteFeedService` to look up posts
  and topics by slug.

### Database and migrations

- SQLite by default, Postgres with `DATABASE_TYPE=postgres`. `synchronize` is off.
- **The migrations are the schema** (`src/database/migrations/`). They use the TypeORM Table API, so they
  run on both drivers, and they run automatically at start-up.
- **Every entity must be listed in `ENTITIES`** in `database/database.module.ts`. It is one list for both
  drivers, so nothing can work on SQLite and break on Postgres.
- **To change the schema, add a new migration file. Never edit one that has been released.** Either
  write it with the Table API (see `1790000000000-Init.ts`), or generate one against a scratch database
  and check it:

  ```bash
  pnpm --dir server run migration:generate src/database/migrations/AddSomething
  ```

  Then add the class to `MIGRATIONS`.
- **Timestamps.** Create/Update date columns use the driver's datetime type. Other times are epoch
  milliseconds in `bigint` columns, with the `asNumber` transformer, which behaves identically on both
  drivers. The process runs in UTC (`common/utc.ts`), because Postgres `timestamp` columns carry no zone.
- **Test on Postgres** before releasing a schema change:

  ```bash
  docker run -d --name pg -p 55432:5432 -e POSTGRES_USER=ab -e POSTGRES_PASSWORD=ab -e POSTGRES_DB=ab postgres:17-alpine
  DATABASE_TYPE=postgres DATABASE_HOST=127.0.0.1 DATABASE_PORT=55432 DATABASE_USER=ab DATABASE_PASSWORD=ab DATABASE_NAME=ab PORT=3099 node server/dist/main.js
  ```

## The API client

`admin/src/sdk/` is **generated** by `openapi-typescript-codegen` from the API's OpenAPI document. Never
edit it by hand. After changing an endpoint or DTO, run:

```bash
pnpm run sdk      # builds the server, writes admin/openapi.json, regenerates admin/src/sdk
```

`pnpm run sdk` boots the API context without listening, so it needs a valid `server/.env` and connects to
the configured database. Every response must be declared with `@ApiOkResponse({ type: … })`: an
undeclared response comes out as `any` and silently loses type safety in the admin.

## Adding a feature end to end

1. **Server:**
   - Add the entity to `ENTITIES`.
   - Add a migration and list it in `MIGRATIONS`.
   - Add the DTOs (class-validator + `@ApiProperty`; query parameters as a DTO class), the service, and
     the controller with `@Staff(...)`, or with `@Limit('<name>')` + `PublicExceptionFilter` for a
     public write.
   - Register the module in `app.module.ts`.
2. **Boot the API** and check `/api/docs`.
3. Run **`pnpm run sdk`**.
4. **Admin:**
   - Add a screen under `admin/src/features/<area>/`.
   - Add **one entry** in `admin/src/app/routes.tsx` (routes are data).
   - Add the nav item in `app/Shell.tsx`.
   - Use TanStack Query with the generated services. List filters live in the URL
     (`shared/url-filters.ts`).
5. **Website,** if it is public: call it from a component script with `api()` (`src/lib/api.ts`,
   relative `/api/public/...`). Keep a plain form post working (`method="post"` to the same endpoint;
   the API answers a browser form with a 303), or hide the widget until the API answers.

## Admin app

- Vite + React 19 + TypeScript strict + Tailwind v4 (`src/styles.css`, with brand tokens in `@theme`),
  plus react-router and TanStack Query.
- **Dark mode** is class-based, toggled in the shell (`shared/theme.ts`).
- **Sign-in:** `app/AuthProvider.tsx` loads `/api/auth/me`. Any 401 returns to `/login`.
- **Roles:** the UI only hides what a role can't do. The server enforces it.
- **Docs** is a sidebar link that opens `/api/admin/docs/` in a new tab (`/docs` only forwards there
  after sign-in, `features/docs/DocsPage.tsx`). The API serves it
  (`server/src/docs/docs.module.ts`, `@Staff()`, left out of the OpenAPI document):
  - a docsify shell, and the docsify and Prism files from the server's `node_modules`, with no CDN
  - `docs/*.md` from `DOCS_DIR`, which is `../docs` in dev and `/app/docs` in the image
  - a sidebar built from those files, in a fixed order with any new guide added alphabetically, titled
    by each file's first `# ` heading

  A new guide in `docs/` appears there without code changes. docsify's Markdown parser is older than
  GitHub's: indent a list item's continuation lines by 2 spaces, not to the text after `- [ ] `, or the
  continuation renders as code. Signed out, the docs page sends the browser to the admin sign-in.
- **Content screens:** Posts (`features/posts/`: list, editor, import/export dialogs), Topics, Authors,
  Pages, Images (`features/media/`, with the picker used everywhere) and Site.
- **The body editor** (`features/editor/`): CodeMirror 6 with Markdown highlighting, a toolbar, insert
  dialogs that write the site's Markdoc (`markdoc.ts`), and live validation through
  `POST /api/admin/content/validate-body`. The tag schema exists three times: `editor/markdoc.ts`
  (what is inserted), `server/src/content/markdoc-schema.ts` (what is accepted) and
  `website/src/lib/markdoc.ts` (what is rendered). Change them together.
- **Downloads** (exports) are plain links (`<a href download>`): the generated client reads binary
  responses as text.

## Website

- **Rendered on request** (`output: 'server'`, `@astrojs/node`). No page is built ahead of time; a
  build is only needed for code changes.
- **Content** comes from `src/lib/content.ts`: one snapshot of everything published
  (`GET /api/public/content/snapshot` on `API_INTERNAL_URL`), kept in memory and refetched when
  `GET /api/public/content/version` changes (checked at most every `CONTENT_POLL_MS`). If the API is
  down, the last snapshot keeps being served; before the first one, pages answer 503
  (`src/middleware.ts`).
  - `src/lib/site.ts` turns it into the `{ id, data }` shape the pages use (references are `{ id }`).
  - Drafts are only reachable through `/preview/<slug>/?token=…` (signed by the API, 2 hours).
- **Runtime settings** (`astro:env`, read when the server starts): `SITE_URL` (the public URL, used
  instead of `Astro.site`; `siteUrl` in `lib/content.ts`), `API_INTERNAL_URL`, `CONTENT_POLL_MS`,
  `GA_MEASUREMENT_ID`.
- **Body rendering** (`src/lib/markdoc.ts`, `components/MarkdocContent.astro`): Markdoc is parsed and
  transformed at request time (cached by revision), and the tree is rendered with:
  - `fence` → `components/content/CodeBlock.astro`: Shiki through Astro's `<Code>`, both themes as CSS
    variables (`global.css`), and `title` / `highlight` / `source` annotations.
  - `image` → `MarkdocImage.astro` (responsive copies for uploaded images).
  - Tags `video`, `callout`, `gallery` and `linkcard` → `components/content/*`.
  - Only plain markup elements are rendered; Markdoc never passes raw HTML through.
- **Images** are the API's: `/api/public/media/<id>/<width>.webp` (`src/lib/media.ts`,
  `components/MediaImage.astro`). Astro's image service is off.
- **Caching:** pages send `X-Accel-Expires: 10`, so nginx (`website/nginx.conf`) keeps them 10 s;
  browsers always revalidate. Resized images are immutable and cached for a week.
- **The sitemap** is `getSiteUrls()` (`src/lib/seo.ts`). Add new indexable routes there, or render
  them with `noindex`.
- `/feed.json`, `/rss.xml` and `/search.json` (the client-side search) come from the same snapshot.
- **Personal pages** (`/subscribe/confirm/`, `/subscribe/manage/`) are `noindex`, blocked in
  `robots.txt`, and served by nginx with `no-store` and `no-referrer`.
