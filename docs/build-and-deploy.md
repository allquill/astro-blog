# Build and deploy

## Images

| Image | From | What it is |
|---|---|---|
| `astro-blog-web` | `website/` | The static Astro site served by nginx. Proxies `/api/` to `server` |
| `astro-blog-admin` | `admin/` | The admin SPA served by nginx. Proxies `/api/` to `server` |
| `astro-blog-api` | `server/` | The NestJS API. Keeps its SQLite database in `/data`. Also carries `docs/` for the admin's Docs page, through the named build context `docs` (compose `additional_contexts`, CI `build-contexts`) |

The API is never published on the host. Both nginx containers reach it as `server:3002` on the compose
network, so the admin cookie and the Origin check work without any CORS setup. The API in turn reads
the site's post list from `http://website/feed.json` (`SITE_FEED_URL`).

### Website build arguments

These are baked into the website image at build time:

- `SITE_URL`: canonical and OG URLs, the sitemap, `llms.txt`, and the post links in `feed.json`, which
  is where the links in new-post e-mails come from. **Set it** for any real deployment.
- `GA_MEASUREMENT_ID`: Google Analytics 4. When unset, the site contains no analytics code. Setting
  up GA4 so tracking works is in [Analytics](analytics.md).

**Content is part of the image.** A new or edited post is published by rebuilding and redeploying the
website image (CI does the build on push).

## Docker Compose

```bash
cp server/env.example docker/.env    # set JWT_SECRET_KEY, ADMIN_PASSWORD, SMTP, PUBLIC_SITE_URL, ADMIN_URL
pnpm run compose:up                  # builds the three images from this checkout and starts them
```

- Site: http://127.0.0.1:8093 (`WEBSITE_PORT`). Admin: http://127.0.0.1:8094 (`ADMIN_PORT`).
- **Data** lives in `docker/volumes/server/` (`DOCKER_VOLUME_FOLDER`): `astro-blog.db`. Back it up.
- **E-mail testing:** set `SMTP_HOST=mailpit` and `SMTP_PORT=1025`, then run
  `docker compose --profile mail up -d`. Messages appear at http://localhost:8025.
- **Postgres:** set `DATABASE_TYPE=postgres`, `DATABASE_HOST=postgres` and the `DATABASE_USER` /
  `DATABASE_PASSWORD` / `DATABASE_NAME` values, then start with `--profile postgres`. Migrations create
  the schema on first start, just as on SQLite.
- **Admin lock-out:** `cd docker && docker compose exec server node dist/cli/set-password.js admin`.
- **Big lists:** the sender pauses between batches (`DIGEST_BATCH_SIZE`, `DIGEST_BATCH_PAUSE_MS`). Match
  them to your SMTP provider's rate limit. For tens of thousands of subscribers, use a provider with a
  high sending quota (SES, Postmark, Mailgun) as the SMTP host.

### Public hostnames

Publish the site and the admin on separate hostnames, for example `www.example.com` and
`admin.example.com`, through cloudflared or a reverse proxy pointing at the two ports. Then set these in
`docker/.env`:

- `PUBLIC_SITE_URL=https://www.example.com`: confirm, manage and unsubscribe links in e-mails
- `ADMIN_URL=https://admin.example.com`: *Open in admin* and invite links
- `CLIENT_IP_HEADER=cf-connecting-ip` behind Cloudflare, so rate limiting sees real client IPs

## CI/CD

The `.github/workflows/` files match ef-website's:

| Workflow | Trigger | Result |
|---|---|---|
| `develop.yaml` | push to `develop` | The three images, tagged `:develop` |
| `publish.yaml` | push to `main` | Runs `check:web`, `check:api` and `check:admin`, bumps the version locally, pushes the images tagged `:<version>` and `:latest`, and only then pushes the bump commit and tag and creates the GitHub Release |
| `manual.yaml` | manual, any branch | The three images, tagged `:manual` |

**Secrets:** `DOCKER_REGISTRY`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

**Variables:** `SITE_URL`, `SITE_URL_DEVELOP`, `GA_MEASUREMENT_ID` and `GA_MEASUREMENT_ID_DEVELOP`.

**Version bumps:** patch by default. A commit starting with `feat:` or containing `[minor]` bumps the
minor version; `[major]` or `BREAKING CHANGE` bumps the major version.

## Deploying a release

```bash
cd docker
docker compose pull        # AB_TAG in .env: latest, develop, manual or a version such as 0.1.3
docker compose up -d
```

Migrations run when the API starts. To roll back, set `AB_TAG` to the previous version and run `up -d`
again. **A migration is not undone by a rollback**, so take a database backup before upgrading across a
release that adds one.
