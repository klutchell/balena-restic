FROM node:17-alpine AS base

# hadolint ignore=DL3018
RUN apk add --no-cache dumb-init restic

WORKDIR /app

FROM base AS deps

COPY *.json ./

RUN npm ci

COPY lib/ lib/

RUN npm run build

FROM base AS final

COPY --from=deps /app/package.json /app/package.json
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/build /app/build

CMD [ "dumb-init", "node", "/app/build/index.js" ]

# ENV BACKUP_CRON "* * * * *"

ENV RESTIC_PASSWORD "balena"
ENV RESTIC_REPOSITORY "/snapshots"
ENV RESTIC_CACHE_DIR "/cache"
