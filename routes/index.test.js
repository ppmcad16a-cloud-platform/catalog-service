const express = require('express');
const request = require('supertest');

// config/passport.js does `mongoose.model('User')` at require time, so the
// User schema must already be registered before it (or anything requiring
// it) is required.
require('../models/user');
const setupPassport = require('../config/passport');
const routes = require('./index');

const app = express();
app.use(express.json());
setupPassport(app);
app.use(routes);

it('returns 404 for an unmatched path under the API prefix', async () => {
  const res = await request(app).get('/api/does-not-exist');
  expect(res.status).toBe(404);
  expect(res.body).toBe('No API route found');
});

it('routes real requests through to the matching resource router', async () => {
  // No Authorization header — routes/api/product.js's own `auth` middleware
  // 401s it, proving the request reached that router rather than falling
  // through to the /api catch-all 404 registered above it.
  const res = await request(app).get('/api/product/list/select');
  expect(res.status).toBe(401);
});

it('leaves non-API paths alone entirely (no route registered)', async () => {
  const res = await request(app).get('/not-under-api-prefix');
  expect(res.status).toBe(404);
});
