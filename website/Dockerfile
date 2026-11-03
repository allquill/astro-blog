# syntax=docker/dockerfile:1
# The public site, as two images from one build (both need to run; see docker/docker-compose.yml):
#
#   --target ssr    astro-blog-web-ssr  Node: renders every page on request from the API's content
#   (default) edge  astro-blog-web      nginx: the site's front door. Serves the built assets, proxies
#                                       /api to the API and everything else to the ssr container, and
#                                       keeps rendered pages for a few seconds.
#
# Nothing about the content or the site URL is baked in: SITE_URL, API_INTERNAL_URL and
# GA_MEASUREMENT_ID are read by the ssr container when it starts.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build && pnpm prune --prod

# ---- ssr: the Astro server ----
FROM node:22-alpine AS ssr
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    API_INTERNAL_URL=http://server:3002
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4321
# robots.txt needs no content, so the check passes while the API is still starting.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:4321/robots.txt >/dev/null || exit 1
CMD ["node", "dist/server/entry.mjs"]

# ---- edge: nginx in front (the default target) ----
FROM nginx:1.27-alpine AS edge
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/client /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/favicon.svg >/dev/null || exit 1
