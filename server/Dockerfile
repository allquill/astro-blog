# syntax=docker/dockerfile:1
# Astro Blog API (NestJS): the blog's content (posts, topics, authors, pages, images), likes, shares,
# mailing list, feedback (SQLite or Postgres), and the admin JSON API.

FROM node:22-alpine AS build
WORKDIR /app
# Toolchain only for native modules (sqlite3, bcrypt) in case no prebuilt binary matches this platform.
# sharp (image resizing) ships prebuilt binaries for musl.
RUN apk add --no-cache python3 make g++
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN pnpm run build && pnpm prune --prod

FROM node:22-alpine
# Fonts for the generated share cards (src/content/og-image.service.ts): sharp draws their SVG text
# through fontconfig, and the base image has no fonts at all.
RUN apk add --no-cache fontconfig font-dejavu
ENV NODE_ENV=production \
    PORT=3002 \
    DATABASE_PATH=/data/astro-blog.db \
    MEDIA_DIR=/data/media \
    DOCS_DIR=/app/docs
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Sample content: `node dist/cli/content.js import seed/content.zip` loads it into an empty blog.
COPY seed ./seed
# The project guides (docs/ at the repo root), served to staff at /api/admin/docs/. A named build context:
# `docker build --build-context docs=../docs` (compose and CI pass it).
COPY --from=docs . ./docs
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:3002/api/health >/dev/null || exit 1
CMD ["node", "dist/main.js"]
