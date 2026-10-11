require('dotenv').config();
const mongoose = require('mongoose');

const keys = require('../config/keys');
const { database } = keys;

// Mongoose 6 changed the default to strictQuery=true, which silently drops
// filter fields that are not in the schema. Keep the Mongoose 5 behaviour
// this code was written (and tested) against.
mongoose.set('strictQuery', false);

// Connects to MongoDB.
//
// If the FIRST connection attempt fails (wrong URI, password, IP not on the
// Atlas allow-list ...) the process exits with code 1. In Kubernetes that
// makes the failure visible (CrashLoopBackOff + alert) and the pod is
// restarted with back-off, instead of a "running" pod that can never serve
// a request. Later disconnects are handled by the driver's auto-reconnect
// and by the /ready probe.
const setupDB = async ({
  logger = console,
  onFailure = () => process.exit(1)
} = {}) => {
  try {
    await mongoose.connect(database.url);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    onFailure(err);
  }
};

module.exports = setupDB;
