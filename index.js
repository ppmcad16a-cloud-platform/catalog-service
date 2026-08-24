// Catalog microservice entry point: product, category, brand, review,
// wishlist. Standalone — shares only the MongoDB database and JWT_SECRET
// with the other microservices.
require('dotenv').config();
const express = require('express');
const chalk = require('chalk');
const cors = require('cors');
const helmet = require('helmet');

const keys = require('./config/keys');
const setupDB = require('./utils/db');

const { port } = keys;
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: true
  })
);
app.use(cors());

setupDB();

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

app.listen(port, () => {
  console.log(
    `${chalk.green('✓')} ${chalk.blue(
      `catalog_server listening on port ${port}. Visit http://localhost:${port}/ in your browser.`
    )}`
  );
});
