// backend/index.js
require('dotenv').config({ path: '.env.local' });
const app = require('./app');
const db = require('./config/database');
const backup = require('./utils/backup');

const port = process.env.PORT || 3001;

db.ready.then(() => {
  backup.start();
  const server = app.listen(port, () => {
    console.log(`🚀 Backend running on http://localhost:${port}`);
  });

  // Connexions HTTP persistantes (keep-alive) adaptées à un reverse proxy
  server.keepAliveTimeout = 65 * 1000;
  server.headersTimeout = 66 * 1000;

  // Arrêt propre (docker stop) : fin des requêtes en cours puis fermeture de la base (checkpoint WAL)
  let stopping = false;
  const shutdown = signal => {
    if (stopping) return;
    stopping = true;
    console.log(`${signal} reçu, arrêt en cours…`);
    const force = setTimeout(() => process.exit(1), 10000);
    force.unref();
    server.close(() => db.close(() => process.exit(0)));
    server.closeIdleConnections?.();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
