# Lumastar web: builds the PWA and serves it with Caddy, which also forwards /api to the API container.
# Build context: the repository root (see docker/compose.yml).
FROM node:24-alpine AS build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/frontend/dist /srv
