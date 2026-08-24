describe('config/keys', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('exposes config values sourced from env vars', () => {
    const keys = require('./keys');

    expect(keys.app.name).toBe('Catalog Service');
    expect(keys.app.apiURL).toBe('api');
    expect(keys.port).toBeDefined();
    expect(keys.database.url).toBe(process.env.MONGO_URI);
    expect(keys.jwt.secret).toBe('test-jwt-secret');
    expect(keys.jwt.tokenLife).toBe('7d');
  });

  it('falls back to the default port when PORT is unset', () => {
    const originalPort = process.env.PORT;
    delete process.env.PORT;

    jest.resetModules();
    const keys = require('./keys');

    expect(keys.port).toBe(3102);

    process.env.PORT = originalPort;
  });
});
