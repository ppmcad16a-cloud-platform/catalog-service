const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'globalConfig.json');

module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }

  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
};
