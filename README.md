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
