# MERN Ecommerce — Catalog microservice

Express + MongoDB microservice: product, category, brand, review, and wishlist. Split out of the original `server/` monolith. Deployed/run independently of `identity_server`, `commerce_server`, `notification_server`, and `api_gateway` — shares only the MongoDB database and `JWT_SECRET` with them.

## Setup

```
cd catalog_server
npm install
cp .env.example .env
```

Fill in `.env` the same way as `identity_server/README.md` describes (`PORT` defaults to `3102`).

## Run

```
npm run dev
npm run start
```

Routes: `/api/product/*`, `/api/category/*`, `/api/brand/*`, `/api/review/*`, `/api/wishlist/*`. Normally reached through `api_gateway`, not directly, in local dev.

## Testing

```
npm test           # jest --coverage
npm run test:watch
```

`jest.config.js` fails the run below **100% statements/branches/functions/lines** coverage — the same bar every other service in this project holds. An HTML report is written to `coverage/index.html`. Tests use `mongodb-memory-server` (no real Mongo needed) and supertest against each router in isolation — see `tests/` for the shared setup.

Node's coverage tooling has no JaCoCo-style complexity counter; `npm run analyze:complexity` reports per-function cyclomatic complexity informationally (via a one-off `eslint` rule, not a committed ESLint config) instead of gating on it.

## Operations (Kubernetes / Docker)

| Endpoint | Used by | Meaning |
|---|---|---|
| `GET /health` | Liveness probe | Process is alive (does not touch the DB) |
| `GET /ready` | Readiness probe | `200` only while MongoDB is connected, else `503` |
| `GET /metrics` | Prometheus | `http_request_duration_seconds` by route template + Node.js process metrics |

- Logs: JSON lines on stdout (pino), `Authorization`/`Cookie` redacted. `LOG_LEVEL` controls verbosity.
- Startup: if the first MongoDB connection fails the process exits with code 1 (Kubernetes restarts it).
- Shutdown: on `SIGTERM` the server finishes in-flight requests, closes MongoDB, then exits.
- Image: `docker build -t catalog-service:local .` (multi-stage, non-root, npm removed at runtime).
- Mongoose 6 (`strictQuery` kept `false` to match the original Mongoose 5 behaviour).
<!-- CD test 2026-10-29: merged -> pushed to 3 registries -> deployed by Jenkins -->
