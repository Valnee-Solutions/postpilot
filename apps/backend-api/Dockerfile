# Cloud Run / Cloud Build often sets the Docker context to this directory
# (apps/backend-api), which does NOT contain the pnpm monorepo root.
# This Dockerfile clones the full repo so the build can succeed anyway.
#
# Preferred long-term: build from repository root with ../../Dockerfile
# and cloudbuild.yaml (context = .).

ARG REPO_URL=https://github.com/Valnee-Solutions/postpilot.git
ARG GIT_REF=main

FROM node:22-alpine AS base
RUN apk add --no-cache git \
 && corepack enable \
 && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS src
ARG REPO_URL
ARG GIT_REF
RUN git clone --depth 1 --branch "${GIT_REF}" "${REPO_URL}" /app

FROM src AS deps
RUN pnpm install --frozen-lockfile

FROM deps AS build
RUN pnpm --filter @postpilot/shared-types build \
 && pnpm --filter @postpilot/shared-utils build \
 && pnpm --filter @postpilot/backend-api build \
 && pnpm --filter @postpilot/backend-api deploy --prod /prod/backend-api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=8080
COPY --from=build /prod/backend-api ./
EXPOSE 8080
CMD ["node", "dist/index.js"]
