// backend/utils/backup.js
// Sauvegardes automatiques de la base SQLite (VACUUM INTO : copie cohérente à chaud)
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const INTERVAL_MINUTES = Number.parseInt(process.env.BACKUP_INTERVAL_MINUTES ?? '60', 10);
const KEEP = Number.parseInt(process.env.BACKUP_KEEP || '48', 10);
const SOURCE = path.resolve(process.env.SQLITE_FILE || './bar.db');
const DIR = process.env.BACKUP_DIR || path.join(path.dirname(SOURCE), 'backups');
const NAME_RE = /^bar-\d{8}-\d{6}(-\d+)?\.db$/;

// La copie se fait sur une connexion dédiée, en lecture seule : VACUUM INTO refuse de s'exécuter tant
// qu'une requête est en cours sur la connexion qui le lance (« cannot VACUUM - SQL statements in
// progress »), ce qui arrivait quand une sauvegarde tombait pendant une lecture volumineuse (historique,
// ventes, export). Le mode WAL permet cette lecture en parallèle.
function vacuumInto(file) {
  return new Promise((resolve, reject) => {
    const conn = new sqlite3.Database(SOURCE, sqlite3.OPEN_READONLY, openErr => {
      if (openErr) return reject(openErr);
      conn.configure('busyTimeout', 5000);
      conn.run('VACUUM INTO ?', [file], runErr =>
        conn.close(closeErr => (runErr || closeErr ? reject(runErr || closeErr) : resolve()))
      );
    });
  });
}

// Nom à la seconde ; VACUUM INTO refuse d'écraser un fichier : un suffixe évite toute collision
function backupFile() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  let file = path.join(DIR, `bar-${stamp}.db`);
  for (let n = 1; fs.existsSync(file); n++) file = path.join(DIR, `bar-${stamp}-${n}.db`);
  return file;
}

async function backup() {
  fs.mkdirSync(DIR, { recursive: true });
  const file = backupFile();
  await vacuumInto(file);

  // Rotation : on ne garde que les KEEP plus récentes
  const files = fs.readdirSync(DIR).filter(f => NAME_RE.test(f)).sort();
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
