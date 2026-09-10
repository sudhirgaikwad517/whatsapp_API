FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite reads VITE_* as real process env vars at build time (baked into the
# static JS bundle) — passed in from docker-compose.yml's build.args, which
# in turn comes from the main repo's own root .env, since this build's
# context (./wabtic-website) can't otherwise see anything outside itself.
ARG VITE_TURNSTILE_SITE_KEY=""
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

RUN npm run build

# nginx-unprivileged runs as the non-root `nginx` user and listens on 8080 by
# default (unprivileged processes can't bind port 80) — avoids running the
# container as root just to serve static files.
FROM nginxinc/nginx-unprivileged:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
