const auth = require('./auth');

it('is an express middleware (passport.authenticate result)', () => {
  expect(typeof auth).toBe('function');
  expect(auth.length).toBe(3);
});
