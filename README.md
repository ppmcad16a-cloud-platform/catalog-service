# catalog-service

Products, categories, brands, reviews and wishlists of the MERN shop, as a REST API.

**Stack:** Node.js 22 · Express · Mongoose 6 · Passport-JWT · pino · prom-client

## Where it fits

| | |
|---|---|
| **Called by** | [api-gateway-service](https://github.com/ppmcad16a-cloud-platform/api-gateway-service) (`/api/product`, `/api/category`, `/api/brand`, `/api/review`, `/api/wishlist`) |
| **Depends on** | MongoDB (shared database `mern_ecommerce`); JWTs issued by [identity-service](https://github.com/ppmcad16a-cloud-platform/identity-service) (same `JWT_SECRET`) |
| **Data seeded by** | [seed-db-service](https://github.com/ppmcad16a-cloud-platform/seed-db-service) (categories, brands, 100 sample products) |
| **Built by** | [core-cloud-platform](https://github.com/ppmcad16a-cloud-platform/core-cloud-platform) `node-app.yaml@v2` |
| **Deployed by** | [platform-deployments](https://github.com/ppmcad16a-cloud-platform/platform-deployments) (Helm + Jenkins) |

Roles used for authorisation: `ROLE ADMIN`, `ROLE MEMBER`, `ROLE MERCHANT`.

## Configuration

| Variable | Meaning | Default |
|---|---|---|
| `PORT` | listen port | `3102` |
| `MONGO_URI` | MongoDB connection string **including** the database name | — |
| `JWT_SECRET` | shared secret, identical in every service (≥ 32 characters) | — |
| `BASE_API_URL` | path prefix | `api` |
| `LOG_LEVEL` | `trace` … `silent` | `info` |

## Run and test

```bash
npm ci
cp .env.example .env      # set MONGO_URI and JWT_SECRET
npm run dev               # or: npm start
npm test                  # Jest, fails below 100 % statements/branches/functions/lines
npm run analyze:complexity   # informational cyclomatic-complexity report
```

Tests use `mongodb-memory-server` (no real MongoDB needed) and supertest against each router. The HTML coverage report is in `coverage/index.html`.

## Container and operations

```bash
docker build -t catalog-service:local .     # multi-stage, non-root, npm removed at runtime
```

| Endpoint | Used by | Meaning |
|---|---|---|
| `GET /health` | liveness probe | process alive (does not touch MongoDB) |
| `GET /ready` | readiness probe | `200` only while MongoDB is connected, else `503` |
| `GET /metrics` | Prometheus | `http_request_duration_seconds` by route + process metrics |

* JSON logs on stdout; `Authorization` and `Cookie` are redacted.
* Fails fast: exits with code 1 if the first MongoDB connection fails; later disconnects are retried by the driver.
* Graceful shutdown on `SIGTERM`: finishes in-flight requests, closes MongoDB, exits.
* Mongoose 6 with `strictQuery: false` to keep the original query behaviour.

## CI/CD

Pull requests run tests, gitleaks and a Trivy-scanned Docker build; a merge to `main` publishes `catalog-service:main-<sha>` to ECR, ACR and Artifact Registry and triggers the Jenkins rollout (GCP → Azure → AWS). See the [CI/CD chapter](https://github.com/ppmcad16a-cloud-platform/core-cloud-platform/blob/main/docs/06-ci-cd.md).
