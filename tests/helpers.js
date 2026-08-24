const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Mongoose = require('mongoose');

const keys = require('../config/keys');
const { ROLES } = require('../constants');
const User = require('../models/user');

// Signs a real, valid token the same way identity_server does, so tests
// exercise the actual passport-jwt strategy end to end instead of stubbing
// `req.user` in.
const createToken = user =>
  `Bearer ${jwt.sign({ id: user._id.toString() }, keys.jwt.secret, {
    expiresIn: '1h'
  })}`;

let counter = 0;
// Unique-enough per call within a single test run (email has a unique
// index) without pulling in a UUID dependency just for tests.
const uniqueEmail = () => `user${Date.now()}${counter++}@test.com`;

const createUser = async ({ password = 'password123', ...rest } = {}) => {
  const hash = await bcrypt.hash(password, 1);
  const user = new User({
    email: uniqueEmail(),
    firstName: 'Test',
    lastName: 'User',
    role: ROLES.Member,
    ...rest,
    password: hash
  });
  return user.save();
};

const createAuthedUser = async overrides => {
  const user = await createUser(overrides);
  const token = createToken(user);
  return { user, token };
};

// A syntactically-invalid ObjectId, useful for exercising the CastError
// branch of a route's generic try/catch (an id that just doesn't exist but
// is validly-formatted would 404/no-op instead of throwing).
const invalidId = 'not-a-valid-object-id';

const newId = () => new Mongoose.Types.ObjectId();

// Several routes fire off a background operation without awaiting it
// (disableProducts' bulkWrite) so the HTTP response doesn't wait on it
// either. A single `setImmediate` tick only flushes microtasks already
// queued by the time it's called — it's NOT long enough to wait for that
// background operation's own real (async, I/O-bound) database round trip to
// finish. Polling `predicate` until it's true (or timing out) waits for the
// actual side effect instead of guessing how many ticks it needs.
const waitFor = async (predicate, { timeout = 2000, interval = 20 } = {}) => {
  const start = Date.now();
  // `await` here works whether `predicate()` returns a plain boolean or a
  // Promise<boolean> — awaiting a non-Promise value just resolves to it
  // immediately, so both sync and async predicates are supported.
  while (!(await predicate())) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor: timed out waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
};

module.exports = {
  createToken,
  createUser,
  createAuthedUser,
  uniqueEmail,
  invalidId,
  newId,
  waitFor
};
