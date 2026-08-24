const jwt = require('jsonwebtoken');

const checkAuth = require('./auth');

describe('checkAuth', () => {
  it('returns null when there is no Authorization header', async () => {
    const result = await checkAuth({ headers: {} });
    expect(result).toBeNull();
  });

  it('decodes a well-formed bearer token without verifying its signature', async () => {
    const token = jwt.sign({ id: 'abc123' }, 'any-secret-at-all');

    const result = await checkAuth({
      headers: { authorization: `Bearer ${token}` }
    });

    expect(result).toMatchObject({ id: 'abc123' });
  });

  it('falls back to the raw header when jwt.decode yields nothing', async () => {
    const result = await checkAuth({
      headers: { authorization: 'Bearer not-a-jwt' }
    });

    expect(result).toBe('Bearer not-a-jwt');
  });

  it('returns null when the authorization header is not a splittable string', async () => {
    const result = await checkAuth({ headers: { authorization: 12345 } });
    expect(result).toBeNull();
  });
});
