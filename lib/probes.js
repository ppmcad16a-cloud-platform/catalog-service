// Kubernetes health probes.
//
//   GET /health  (liveness)  "is the process alive?"
//                            If this fails repeatedly Kubernetes RESTARTS
//                            the container. It must not depend on the DB,
//                            otherwise a database blip would restart every
//                            pod at once.
//   GET /ready   (readiness) "can I serve requests right now?"
//                            Checks the MongoDB connection. While it fails,
//                            Kubernetes simply stops SENDING traffic to the
//                            pod (no restart).
const express = require('express');

const createProbeRouter = ({ isReady }) => {
  const router = express.Router();

  router.get('/health', (req, res) => res.json({ status: 'ok' }));

  router.get('/ready', (req, res) => {
    if (isReady()) return res.json({ status: 'ready' });
    return res.status(503).json({ status: 'not ready' });
  });

  return router;
};

// mongoose.connection.readyState: 0 disconnected, 1 connected,
// 2 connecting, 3 disconnecting. Only 1 means "ready".
const mongooseIsReady = mongoose => () => mongoose.connection.readyState === 1;

module.exports = { createProbeRouter, mongooseIsReady };
