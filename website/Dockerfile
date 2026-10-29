# syntax=docker/dockerfile:1

# ---- build: static site into /app/dist ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Canonical/OG URLs and the links in feed.json (and so in e-mails). Override with:
#   docker build --build-arg SITE_URL=https://blog.example.com .
ARG SITE_URL
ENV SITE_URL=${SITE_URL}
# GA4 measurement ID (G-…). Empty = no analytics in the image.
ARG GA_MEASUREMENT_ID
ENV GA_MEASUREMENT_ID=${GA_MEASUREMENT_ID}
RUN pnpm run build

# ---- runtime: nginx serving static files ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
