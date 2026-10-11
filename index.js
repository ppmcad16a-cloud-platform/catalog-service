// Catalog microservice entry point: product, category, brand, review,
// wishlist. Standalone — shares only the MongoDB database and JWT_SECRET
// with the other microservices.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const keys = require('./config/keys');
const setupDB = require('./utils/db');
const { createObservability } = require('./lib/observability');
const { createProbeRouter, mongooseIsReady } = require('./lib/probes');
const { registerShutdown } = require('./lib/shutdown');

const { port } = keys;

// Metrics label = the matched route template, e.g. "/api/product/:id",
// never the real URL (ids would explode the number of time series).
const routeLabel = req => (req.route ? `${req.baseUrl}${req.route.path}` : 'other');

const { logger, httpLogger, metricsMiddleware, metricsHandler } = createObservability({
  service: 'catalog-service',
  logLevel: process.env.LOG_LEVEL,
  routeLabel
});

const app = express();

app.use(httpLogger);
app.use(metricsMiddleware);
app.use(createProbeRouter({ isReady: mongooseIsReady(mongoose) }));
app.get('/metrics', metricsHandler);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: true
  })
);
app.use(cors());

setupDB({ logger });

require('./models/user');
require('./models/merchant');
require('./models/product');
require('./models/category');
require('./models/brand');
require('./models/review');
require('./models/wishlist');

require('./config/passport')(app);

const routes = require('./routes');
app.use(routes);

const server = app.listen(port, () => {
  logger.info({ port }, 'catalog-service listening');
});

registerShutdown({ server, logger, cleanup: () => mongoose.disconnect() });
