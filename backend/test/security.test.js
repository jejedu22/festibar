const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('motdepasse-admin-solide', 4);
delete process.env.ADMIN_TOTP_SECRET;
process.env.TRUST_PROXY = '1';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { start } = require('./helpers');
const { backup } = require('../utils/backup');

let t;
let admin;
before(async () => {
  t = await start();
  admin = (await t.call('POST', '/admin/auth/login', { body: { password: 'motdepasse-admin-solide' } })).json.token;
});
after(() => t.stop());

const createOrg = slug =>
  t.call('POST', '/admin/organizations', { token: admin, body: { name: `Org ${slug}`, slug, password: 'manager-pass', staff_password: 'staff-pass' } });
const updateOrg = (id, slug, extra) =>
  t.call('PUT', `/admin/organizations/${id}`, { token: admin, body: { name: `Org ${slug}`, slug, ...extra } });

test('session d’organisation : changer le mot de passe coupe aussitôt les sessions de ce rôle, et elles seulement', async () => {
  const { json: org } = await createOrg('rotation');
  const manager = await t.login('rotation', 'manager-pass');
  const staff = await t.login('rotation', 'staff-pass');
  const orders = token => t.call('GET', '/rotation/orders/1', { token });
  assert.notEqual((await orders(staff)).status, 401);

  // Nouveau mot de passe serveurs : les serveurs sont déconnectés, le gestionnaire non
  assert.equal((await updateOrg(org.id, 'rotation', { staff_password: 'nouveau-staff' })).status, 200);
  assert.equal((await orders(staff)).status, 401);
  assert.notEqual((await orders(manager)).status, 401);
  const again = await t.login('rotation', 'nouveau-staff');
  assert.notEqual((await orders(again)).status, 401);

  // Nouveau mot de passe gestionnaire : le gestionnaire est déconnecté
  assert.equal((await updateOrg(org.id, 'rotation', { password: 'nouveau-manager' })).status, 200);
  assert.equal((await orders(manager)).status, 401);

  // Mot de passe serveurs retiré : plus aucun accès serveur
  assert.equal((await updateOrg(org.id, 'rotation', { remove_staff_password: true })).status, 200);
  assert.equal((await orders(again)).status, 401);
});

test('session d’organisation : les jetons émis avant cette vérification (sans empreinte) restent acceptés jusqu’à expiration', async () => {
  await createOrg('ancien');
  const { json: orgs } = await t.call('GET', '/admin/organizations', { token: admin });
  const org = orgs.find(o => o.slug === 'ancien');
  const legacy = jwt.sign({ role: 'manager', orgId: org.id, slug: 'ancien' }, 'test-secret', { algorithm: 'HS256', expiresIn: '1h' });
  assert.notEqual((await t.call('GET', '/ancien/orders/1', { token: legacy })).status, 401);
});

test('organisation : mot de passe de plus de 72 octets refusé (bcrypt le tronquerait)', async () => {
  const r = await t.call('POST', '/admin/organizations', { token: admin, body: { name: 'Long', slug: 'long', password: 'x'.repeat(73) } });
  assert.equal(r.status, 400);
  assert.match(r.json.error, /72/);
});

test('produit : le contrôle « déjà vendu » ignore les ventes des autres organisations', async () => {
  await createOrg('alpha');
  await createOrg('beta');
  const alpha = await t.login('alpha', 'manager-pass');
  const beta = await t.login('beta', 'manager-pass');
  const cat = (await t.call('POST', '/beta/categories', { token: beta, body: { name: 'Bières' } })).json;
  const product = (await t.call('POST', '/beta/products', { token: beta, body: { name: 'Blonde', price: 3, category_id: cat.id, available: true } })).json;
  await t.call('POST', '/beta/orders', { token: beta, body: { items: [{ productId: product.id, quantity: 1 }] } });

  // L'autre organisation ne peut ni supprimer ce produit ni savoir qu'il a été vendu
  const r = await t.call('DELETE', `/alpha/products/${product.id}`, { token: alpha });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { deleted: 0 });
  assert.equal((await t.call('GET', '/beta/products')).json.length, 1);
});

test('contact : adresses pouvant désigner plusieurs destinataires refusées', async () => {
  const send = email => t.call('POST', '/contact', { body: { name: 'Anne', email, message: 'Bonjour' }, headers: { 'x-forwarded-for': `10.7.0.${Math.floor(Math.random() * 250)}` } });
  for (const bad of ['a@b.fr,c@d.fr', '"a@b.fr"@c.fr', 'a@b.fr;c@d.fr', 'Anne <a@b.fr>', 'a@b.fr (c@d.fr)', 'a@b']) {
    assert.equal((await send(bad)).status, 400, bad);
  }
  assert.equal((await send('anne.dupont+festibar@asso-exemple.fr')).status, 201);
});

test('fichiers : base et sauvegardes lisibles par leur propriétaire seulement', { skip: process.platform === 'win32' }, async () => {
  const file = await backup();
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal(fs.statSync(require('path').dirname(file)).mode & 0o777, 0o700);
  assert.equal(fs.statSync(process.env.SQLITE_FILE).mode & 0o777, 0o600);
});
