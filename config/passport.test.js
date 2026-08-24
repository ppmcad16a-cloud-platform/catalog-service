const express = require('express');
const request = require('supertest');

require('../tests/registerModels');
const dbHandler = require('../tests/dbHandler');
const { createUser, createToken, newId } = require('../tests/helpers');
const setupPassport = require('./passport');
const auth = require('../middleware/auth');
const User = require('../models/user');

const app = express();
setupPassport(app);
app.get('/protected', auth, (req, res) => res.status(200).json({ id: req.user.id }));

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clear();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await dbHandler.disconnect();
});

it('rejects a request with no token', async () => {
  const res = await request(app).get('/protected');
  expect(res.status).toBe(401);
});

it('authenticates a request with a valid token for an existing user', async () => {
  const user = await createUser();
  const token = createToken(user);

  const res = await request(app).get('/protected').set('Authorization', token);

  expect(res.status).toBe(200);
  expect(res.body.id).toBe(user._id.toString());
});

it('rejects a valid token whose user no longer exists', async () => {
  const token = createToken({ _id: newId() });

  const res = await request(app).get('/protected').set('Authorization', token);

  expect(res.status).toBe(401);
});

it('passes a lookup error to error-handling middleware (done(err, false))', async () => {
  const user = await createUser();
  const token = createToken(user);
  jest
    .spyOn(User, 'findById')
    .mockReturnValueOnce(Promise.reject(new Error('db down')));

  const res = await request(app).get('/protected').set('Authorization', token);

  // passport-jwt's done(err, false) makes Passport call next(err) rather
  // than responding 401 itself — with no custom error middleware here,
  // Express's default handler turns that into a 500.
  expect(res.status).toBe(500);
});
