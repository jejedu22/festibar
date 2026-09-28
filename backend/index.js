// backend/index.js
require('dotenv').config({ path: '.env.local' });
const app = require('./app');
const db = require('./config/database');
const backup = require('./utils/backup');

const port = process.env.PORT || 3000;

db.ready.then(() => {
  backup.start();
  app.listen(port, () => {
    console.log(`🚀 Backend running on http://localhost:${port}`);
  });
});
