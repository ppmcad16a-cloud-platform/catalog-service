const express = require('express');
const request = require('supertest');
const { createProbeRouter, mongooseIsReady } = require('./probes');

const buildApp = isReady => {
  const app = express();
  app.use(createProbeRouter({ isReady }));
  return app;
};

it('answers /health with 200 regardless of the database', async () => {
  const res = await request(buildApp(() => false)).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

it('answers /ready with 200 when the database is connected', async () => {
  const res = await request(buildApp(() => true)).get('/ready');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ready' });
});

it('answers /ready with 503 when the database is not connected', async () => {
  const res = await request(buildApp(() => false)).get('/ready');
  expect(res.status).toBe(503);
  expect(res.body).toEqual({ status: 'not ready' });
});

it.each([
  [0, false],
  [1, true],
  [2, false],
  [3, false]
])('mongooseIsReady maps readyState %i to %s', (readyState, expected) => {
  const fakeMongoose = { connection: { readyState } };
  expect(mongooseIsReady(fakeMongoose)()).toBe(expected);
});
