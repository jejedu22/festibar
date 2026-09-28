// backend/utils/backup.js
// Sauvegardes automatiques de la base SQLite (VACUUM INTO : copie cohérente à chaud)
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const INTERVAL_MINUTES = Number.parseInt(process.env.BACKUP_INTERVAL_MINUTES ?? '60', 10);
const KEEP = Number.parseInt(process.env.BACKUP_KEEP || '48', 10);
const DIR = process.env.BACKUP_DIR || path.join(path.dirname(path.resolve(process.env.SQLITE_FILE || './bar.db')), 'backups');

async function backup() {
  fs.mkdirSync(DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const file = path.join(DIR, `bar-${stamp}.db`);
  await db.runAsync(`VACUUM INTO ?`, [file]);

  // Rotation : on ne garde que les KEEP plus récentes
  const files = fs.readdirSync(DIR).filter(f => /^bar-\d{8}-\d{6}\.db$/.test(f)).sort();
  for (const old of files.slice(0, Math.max(0, files.length - KEEP))) fs.unlinkSync(path.join(DIR, old));
  return file;
}

function start() {
  if (!INTERVAL_MINUTES) return;
  const run = () => backup().catch(err => console.error('❌ Sauvegarde impossible :', err));
  setInterval(run, INTERVAL_MINUTES * 60 * 1000).unref();
  console.log(`💾 Sauvegarde de la base toutes les ${INTERVAL_MINUTES} min dans ${DIR}`);
}

module.exports = { backup, start };
