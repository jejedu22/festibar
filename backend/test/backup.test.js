const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { start } = require('./helpers');
const { backup } = require('../utils/backup');

let t;

before(async () => {
  t = await start();
  await t.createOrg('bar');
});
after(() => t.stop());

// Une requête en cours sur la connexion principale (lecture volumineuse : historique, ventes, export)
// faisait échouer VACUUM INTO : « cannot VACUUM - SQL statements in progress ».
test('sauvegarde : réussit même quand une requête est en cours sur la connexion principale', async () => {
  const stmt = t.db.prepare('SELECT * FROM organizations');
  await new Promise((resolve, reject) => stmt.get(err => (err ? reject(err) : resolve()))); // requête entamée, non terminée

  // Contrôle : la connexion principale est bien dans l'état qui provoquait l'échec
  await assert.rejects(t.db.runAsync('VACUUM INTO ?', [`${fs.mkdtempSync(require('os').tmpdir() + '/vac-')}/x.db`]), /statements in progress/);

  const file = await backup();
  assert.ok(fs.statSync(file).size > 0);

  // La copie est une base valide qui contient les données
  const copy = new sqlite3.Database(file, sqlite3.OPEN_READONLY);
  const count = await new Promise((resolve, reject) =>
    copy.get('SELECT COUNT(*) AS n FROM organizations', (err, row) => (err ? reject(err) : resolve(row.n)))
  );
  await new Promise(resolve => copy.close(resolve));
  assert.equal(count, 1);
  stmt.finalize();
});

test('sauvegarde : deux sauvegardes dans la même seconde ne se marchent pas dessus', async () => {
  const [first, second] = [await backup(), await backup()];
  assert.notEqual(first, second);
  assert.ok(fs.existsSync(first) && fs.existsSync(second));
});
