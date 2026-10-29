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

### Networks

Three compose networks keep everything except the two nginx containers private:

| Network | Members | What it allows |
|---|---|---|
| `frontend` | website, admin, cloudflared, mailpit | Host ports and the Cloudflare tunnel. The API and the database are not on it |
| `backend` (internal, no internet) | website, admin, server, postgres, mailpit | `/api` from nginx to `server:3002`, the API to Postgres and Mailpit, and the API reading `http://website/feed.json` |
| `egress` | server | The API's outbound connections (the SMTP provider). Nothing connects in |

- **Published on the host:** only the website (`WEBSITE_PORT`), the admin (`ADMIN_PORT`) and, with
  `--profile mail`, Mailpit's inbox (`MAILPIT_PORT`). All of them bind to `BIND_ADDRESS`.
- **Not reachable from outside:** the API and Postgres have no host ports, and cloudflared can reach
  only the website and the admin. Postgres has no internet access.
- **Mailpit's SMTP port** (1025) is not published. The API reaches it as `mailpit:1025`; for local
  development without Docker, run Mailpit on its own (see [Getting started](getting-started.md)).
- **A new service** goes on `backend` only, unless it needs a host port (`frontend`) or the internet
  (`egress` for the API, `frontend` otherwise). Define it in `docker-compose.yml`; the build file
  inherits its networks through `extends`, but repeats the three network definitions at the bottom.

### Website build arguments

These are baked into the website image at build time:

- `SITE_URL`: canonical and OG URLs, the sitemap, `llms.txt`, and the post links in `feed.json`, which
  is where the links in new-post e-mails come from. **Set it** for any real deployment.
- `GA_MEASUREMENT_ID`: Google Analytics 4. When unset, the site contains no analytics code. Setting
  up GA4 so tracking works is in [Analytics](analytics.md).

**Content is part of the image.** A new or edited post is published by rebuilding and redeploying the
website image (CI does the build on push).

## Docker Compose

Two compose files in `docker/`, with the same services and one project name (`astro-blog`), so they
share containers and data and either can replace the other:

| File | Images | Start with |
|---|---|---|
| `docker-compose.yml` | Prebuilt, pulled from `AB_REGISTRY` with tag `AB_TAG` (what CI pushes) | `pnpm run compose:up`, or `cd docker && docker compose pull && docker compose up -d` |
| `docker-compose-build.yml` | Built from this checkout, named `astro-blog-*:<AB_BUILD_TAG>` (default `local`) | `pnpm run compose:build`, or `cd docker && docker compose -f docker-compose-build.yml up -d --build` |

The build file takes every service from `docker-compose.yml` (`extends`) and adds only how to build it,
so ports, volumes and healthchecks are defined once. Building never overwrites a registry tag.

```bash
cp docker/env.example docker/.env    # set JWT_SECRET_KEY, ADMIN_PASSWORD, SMTP, PUBLIC_SITE_URL, ADMIN_URL
pnpm run compose:up                  # prebuilt images; or pnpm run compose:build to build them here
```

`docker/env.example` holds both the compose settings (images, ports, data folder, tunnel token) and the
API's settings, which the `server` container receives from `docker/.env`. `SITE_URL` and
`GA_MEASUREMENT_ID` only matter to the build file: prebuilt images carry the values CI built them with.

- Site: http://127.0.0.1:8093 (`WEBSITE_PORT`). Admin: http://127.0.0.1:8094 (`ADMIN_PORT`).
- **Data** lives in `docker/volumes/server/` (`DOCKER_VOLUME_FOLDER`): `astro-blog.db`. Back it up.
- **Optional services** are profiles, added to either file's `up` command: `--profile mail`,
  `--profile postgres`, `--profile cloudflare`.
- **E-mail testing:** set `SMTP_HOST=mailpit` and `SMTP_PORT=1025`, then start with `--profile mail`.
  Messages appear at http://localhost:8025.
- **Postgres:** set `DATABASE_TYPE=postgres`, `DATABASE_HOST=postgres` and the `DATABASE_USER` /
  `DATABASE_PASSWORD` / `DATABASE_NAME` values, then start with `--profile postgres`. The API waits for
  Postgres to be healthy, and migrations create the schema on first start, just as on SQLite.
- **Cloudflare Tunnel:** set `CLOUDFLARE_TUNNEL_TOKEN`, start with `--profile cloudflare`, and route the
  tunnel's hostnames to `http://website:80` and `http://admin:80` in the Cloudflare dashboard.
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
docker compose pull        # docker-compose.yml; AB_TAG in .env: latest, develop, manual or a version such as 0.1.3
docker compose up -d
```

Migrations run when the API starts. To roll back, set `AB_TAG` to the previous version and run `up -d`
again. **A migration is not undone by a rollback**, so take a database backup before upgrading across a
release that adds one.
