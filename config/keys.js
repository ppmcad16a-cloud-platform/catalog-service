module.exports = {
  app: {
    name: 'Catalog Service',
    apiURL: `${process.env.BASE_API_URL}`
  },
  port: process.env.PORT || 3102,
  database: {
    url: process.env.MONGO_URI
  },
  jwt: {
    // Must be identical across every microservice — see identity_server's
    // config/keys.js for the full rationale.
    secret: process.env.JWT_SECRET,
    tokenLife: '7d'
  }
};
