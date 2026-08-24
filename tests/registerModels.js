// Registers every Mongoose model this service knows about on this test
// file's module registry. Several routes `.populate()` a path referencing a
// model that isn't required directly by that route file (e.g. brand.js
// populates 'merchant' without requiring the Merchant model itself) —
// Mongoose throws MissingSchemaError if that model was never registered.
// Requiring everything up front here, before any router/test code runs,
// avoids having to work out each route's actual populate graph one at a time.
require('../models/user');
require('../models/merchant');
require('../models/brand');
require('../models/category');
require('../models/product');
require('../models/review');
require('../models/wishlist');
