const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const { start } = require('./helpers');

let t;
let manager;
let staff;
let beerId;

before(async () => {
  t = await start();
  await t.createOrg('bar');
  manager = await t.login('bar', 'manager-pass');
  staff = await t.login('bar', 'staff-pass');
  const cat = (await t.call('POST', '/bar/categories', { token: manager, body: { name: 'Bières' } })).json;
  beerId = (await t.call('POST', '/bar/products', {
    token: manager, body: { name: 'Blonde', price: 0.1, category_id: cat.id, available: true },
  })).json.id;
});
after(() => t.stop());

// Télécharge l'export et le relit avec ExcelJS, comme le ferait Excel
async function downloadExport(token = manager, slug = 'bar') {
  const res = await fetch(`${t.base}/${slug}/summary/daily/export`, { headers: { authorization: `Bearer ${token}` } });
  const bytes = Buffer.from(await res.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  if (res.ok) await workbook.xlsx.load(bytes);
  return { res, bytes, workbook };
}

test('export : fichier Excel complet, formats conservés, annulations tracées', async () => {
  const order = async items => (await t.call('POST', '/bar/orders', { token: staff, body: { items, paymentMethod: 'card' } })).json;
  await order([{ productId: beerId, quantity: 3 }]);              // 3 × 0,10 € : le total doit être 0,30 € (pas 0,30000000000000004)
  const toCancel = await order([{ productId: beerId, quantity: 1 }]);
  await t.call('DELETE', `/bar/orders/${toCancel.orderId}`, { token: manager });
  // Le journal d'audit est écrit en tâche de fond : on attend qu'il soit en base
  for (let i = 0; i < 50 && !(await t.db.getAsync('SELECT 1 AS ok FROM audit_log')); i++) await new Promise(r => setTimeout(r, 20));

  const { res, workbook } = await downloadExport();
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /spreadsheetml\.sheet/);
  assert.match(res.headers.get('content-disposition'), /attachment; filename="commandes-bar\.xlsx"/);

  const sheet = workbook.getWorksheet('Commandes');
  assert.deepEqual(sheet.getRow(1).values.slice(1),
    ['Journée', 'Date / Heure', 'N° commande', 'Statut', 'Paiement', 'Produit', 'Quantité', 'Prix unitaire', 'Total']);
  assert.equal(sheet.getRow(1).getCell(1).font.bold, true);
  assert.equal(sheet.rowCount, 3); // en-tête + 2 commandes d'une ligne

  const first = sheet.getRow(2);
  assert.equal(first.getCell(4).value, 'Validée');
  assert.equal(first.getCell(5).value, 'Carte');
  assert.equal(first.getCell(6).value, 'Blonde');
  assert.equal(first.getCell(7).value, 3);
  assert.equal(first.getCell(8).value, 0.1);
  assert.equal(first.getCell(9).value, 0.3);
  assert.match(first.getCell(9).numFmt, /€/);
  assert.equal(sheet.getRow(3).getCell(4).value, 'Annulée');

  // L'annulation figure dans le journal
  const journal = workbook.getWorksheet('Journal');
  assert.equal(journal.getRow(1).getCell(2).value, 'Action');
  assert.equal(journal.getRow(2).getCell(2).value, 'order.cancel');
  assert.equal(journal.getRow(2).getCell(4).value, 'manager');
});

test('export : réservé au gestionnaire de l’organisation', async () => {
  assert.equal((await fetch(`${t.base}/bar/summary/daily/export`)).status, 401);
  assert.equal((await downloadExport(staff)).res.status, 403);
  await t.createOrg('autre');
  const other = await t.login('autre', 'manager-pass');
  assert.equal((await downloadExport(other)).res.status, 401);
});

test('export : une rafale de téléchargements simultanés aboutit pour tous, sans fichier tronqué', async () => {
  const downloads = await Promise.all(Array.from({ length: 12 }, () => downloadExport()));
  for (const { res, workbook } of downloads) {
    assert.equal(res.status, 200);
    assert.equal(workbook.getWorksheet('Commandes').rowCount, 3);
    assert.ok(workbook.getWorksheet('Journal'));
  }
});

test('export : gros volume, relu intégralement (20 000 lignes)', async () => {
  const lines = 20000;
  await t.db.runAsync(
    `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
     INSERT INTO orders (organization_id, total, timestamp, status, payment_method)
     SELECT (SELECT id FROM organizations WHERE slug = 'bar'), 0.11, datetime('now'), 'active', 'cash' FROM n`,
    [lines]
  );
  await t.db.runAsync(
    `INSERT INTO order_items (order_id, product_id, quantity, price)
     SELECT id, ?, 1, 0.1 FROM orders WHERE total = 0.11`,
    [beerId]
  );
  const { res, workbook } = await downloadExport();
  assert.equal(res.status, 200);
  assert.equal(workbook.getWorksheet('Commandes').rowCount, 1 + 2 + lines);
});

test('connexion : une rafale d’appareils aux mêmes mots de passe ne coûte que 3 calculs bcrypt', async () => {
  await t.createOrg('rafale');
  const compare = bcrypt.compare;
  const spy = mock.method(bcrypt, 'compare', (...args) => compare(...args));

  const results = await Promise.all([
    ...Array.from({ length: 40 }, () => t.call('POST', '/rafale/login', { body: { password: 'staff-pass' } })),
    ...Array.from({ length: 6 }, () => t.call('POST', '/rafale/login', { body: { password: 'manager-pass' } })),
  ]);
  assert.ok(results.slice(0, 40).every(r => r.status === 200 && r.json.role === 'staff' && r.json.token));
  assert.ok(results.slice(40).every(r => r.status === 200 && r.json.role === 'manager' && r.json.token));
  // Sans mémorisation : 6 + 40 × 2 = 86 calculs. Avec : (empreinte gestionnaire, mot de passe serveurs),
  // (empreinte serveurs, mot de passe serveurs) et (empreinte gestionnaire, mot de passe gestionnaire).
  assert.equal(spy.mock.calls.length, 3);
  mock.restoreAll();
});

test('connexion : un mot de passe changé n’ouvre plus l’ancien accès, la limitation des échecs reste active', async () => {
  await t.createOrg('rotation');
  assert.equal((await t.call('POST', '/rotation/login', { body: { password: 'staff-pass' } })).json.role, 'staff');

  await t.db.runAsync('UPDATE organizations SET staff_password = ? WHERE slug = ?', [await bcrypt.hash('nouveau-staff', 4), 'rotation']);
  assert.equal((await t.call('POST', '/rotation/login', { body: { password: 'staff-pass' } })).status, 401);
  assert.equal((await t.call('POST', '/rotation/login', { body: { password: 'nouveau-staff' } })).json.role, 'staff');

  // Les échecs, même mémorisés, sont comptés à chaque requête : la 11e tentative est bloquée
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await t.call('POST', '/rotation/login', { body: { password: 'toujours-faux' } })).status);
  assert.deepEqual(statuses, [...Array(10).fill(401), 429, 429]);
});
