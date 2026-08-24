// Jest config for the catalog_server test suite. Tests live next to the
// source files they cover (*.test.js); shared test infrastructure
// (in-memory Mongo bootstrap, a supertest app factory, model registration)
// lives in tests/.
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  testTimeout: 30000,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!jest.config.js',
    '!**/*.test.js'
  ],
  // No JaCoCo-style COMPLEXITY counter exists for Istanbul/nyc (same gap
  // documented for commerce_server's coverage.py) — branches/functions/lines/
  // statements all at 100% is the full enforced bar here; see package.json's
  // analyze:complexity script for an informational-only complexity report.
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    }
  }
};
