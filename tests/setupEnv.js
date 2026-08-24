const fs = require('fs');
const path = require('path');

// Runs (via jest.config.js's `setupFiles`) before each test file's module
// registry is set up, so these are in place before config/keys.js (or
// anything that reads process.env) is ever required. dotenv().config()
// (called by utils/db.js/index.js) never overwrites a variable that's
// already set, so a developer's own catalog_server/.env is never consulted
// here.
process.env.BASE_API_URL = 'api';
process.env.JWT_SECRET = 'test-jwt-secret';

const configPath = path.join(__dirname, 'globalConfig.json');
if (fs.existsSync(configPath)) {
  const { mongoUri } = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  process.env.MONGO_URI = mongoUri;
}
