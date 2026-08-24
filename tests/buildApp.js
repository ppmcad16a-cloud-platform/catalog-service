const express = require('express');

require('./registerModels');
const setupPassport = require('../config/passport');

// Minimal Express app for supertest: JSON body parsing + Passport's JWT
// strategy (so the real `auth` middleware in the router under test works
// against real, signed tokens) + the router itself mounted at the root, so
// tests hit the router's own relative paths (e.g. '/add', '/:id') directly
// instead of re-declaring each resource's mount prefix from routes/api/index.js.
const buildApp = router => {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  setupPassport(app);
  app.use('/', router);
  return app;
};

module.exports = buildApp;
