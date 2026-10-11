# ============================================================
# Catalog Service - container image
#
# Multi-stage build:
#   1. "deps"    installs production dependencies only
#   2. "runtime" copies them + the source into a small image
#
# Security:
#   - runs as the unprivileged "node" user (not root)
#   - no dev dependencies, tests or .env files in the image
#   - npm/yarn removed from the runtime image
#   - started with "node" directly so SIGTERM reaches the app
#     (graceful shutdown during rolling updates)
# ============================================================

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: never run third-party install scripts at build time
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force


FROM node:22-alpine AS runtime
ENV NODE_ENV=production

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 3102

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3102/health || exit 1

CMD ["node", "index.js"]
