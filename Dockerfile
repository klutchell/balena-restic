# https://hub.docker.com/_/golang
FROM golang:1.18.5-alpine3.16 AS restic

# hadolint ignore=DL3018
RUN apk add --no-cache build-base curl git

WORKDIR /app

SHELL ["/bin/ash", "-eo", "pipefail", "-c"]

ARG RESTIC_TAG=0.14.0
ARG RESTIC_SHA256=78cdd8994908ebe7923188395734bb3cdc9101477e4163c67e7cc3b8fd3b4bd6

RUN curl -fsSL -o restic.tar.gz \
    https://github.com/restic/restic/archive/refs/tags/v${RESTIC_TAG}.tar.gz && \
    echo "${RESTIC_SHA256}  restic.tar.gz" | sha256sum -c - && \
    tar -xzf restic.tar.gz --strip 1 && \
    rm restic.tar.gz && \
    go run build.go
    
FROM node:16-alpine AS base

# hadolint ignore=DL3018
RUN apk add --no-cache dumb-init blkid

WORKDIR /app

FROM base AS dev

COPY *.json ./

RUN npm ci

FROM dev as build

COPY lib/ lib/

RUN npm run build

FROM base AS prod

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/build /app/build
COPY --from=restic /app/restic /usr/bin/restic

RUN npm ci --omit=dev

CMD [ "dumb-init", "node", "/app/build/index.js" ]

# default to every 8 hours
ENV BACKUP_CRON "0 */8 * * *"
ENV RESTIC_REPOSITORY "/snapshots"
ENV RESTIC_CACHE_DIR "/cache"
ENV TMPDIR "/tmp"

VOLUME /snapshots /cache
