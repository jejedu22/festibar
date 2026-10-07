const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

let t;
let manager;
let staff;
let beer;

before(async () => {
  t = await start();
  await t.createOrg('bar');
  await t.createOrg('autre');
  manager = await t.login('bar', 'manager-pass');
  staff = await t.login('bar', 'staff-pass');
});
after(() => t.stop());

test('connexion : rôles et mauvais mot de passe', async () => {
  assert.ok(manager && staff);
  const bad = await t.call('POST', '/bar/login', { body: { password: 'nope' } });
  assert.equal(bad.status, 401);
  const unknown = await t.call('POST', '/inconnu/login', { body: { password: 'x' } });
  assert.equal(unknown.status, 404);
});

test('autorisations : jeton requis, rôle et organisation vérifiés', async () => {
  assert.equal((await t.call('GET', '/bar/summary/daily')).status, 401);
  assert.equal((await t.call('GET', '/bar/summary/daily', { token: staff })).status, 403);
  const other = await t.login('autre', 'manager-pass');
  assert.equal((await t.call('GET', '/bar/summary/daily', { token: other })).status, 401);
});

test('catégories et produits : création et réordonnancement atomique', async () => {
  const a = (await t.call('POST', '/bar/categories', { token: manager, body: { name: 'Bières' } })).json;
  const b = (await t.call('POST', '/bar/categories', { token: manager, body: { name: 'Softs' } })).json;
  const dup = await t.call('POST', '/bar/categories', { token: manager, body: { name: 'Bières' } });
  assert.equal(dup.status, 409);

  const reorder = await t.call('PUT', '/bar/categories/order', {
    token: manager,
    body: { order: [{ id: a.id, sort_order: 2 }, { id: b.id, sort_order: 1 }] },
  });
  assert.deepEqual(reorder.json, { success: true, updated: 2 });
  const list = (await t.call('GET', '/bar/categories', { token: manager })).json;
  assert.deepEqual(list.map(c => c.name), ['Softs', 'Bières']);

  // Une catégorie d'une autre organisation n'est jamais modifiée
  const foreign = await t.call('PUT', '/bar/categories/order', {
    token: manager, body: { order: [{ id: 9999, sort_order: 1 }] },
  });
  assert.equal(foreign.json.updated, 0);
  assert.equal((await t.call('PUT', '/bar/categories/order', { token: manager, body: { order: 'x' } })).status, 400);

  const p = await t.call('POST', '/bar/products', {
    token: manager, body: { name: 'Blonde', price: 3.5, category_id: a.id, available: true },
  });
  assert.equal(p.status, 201);
  beer = p.json;
  const bad = await t.call('POST', '/bar/products', { token: manager, body: { name: '', price: -1 } });
  assert.equal(bad.status, 400);
});

test('commandes : total, validation, idempotence et rupture de stock', async () => {
  const create = body => t.call('POST', '/bar/orders', { token: staff, body });

  assert.equal((await create({ items: [] })).status, 400);
  assert.equal((await create({ items: [{ productId: beer.id, quantity: 0 }] })).status, 400);
  assert.equal((await create({ items: [{ productId: 9999, quantity: 1 }] })).status, 400);

  // Lignes d'un même produit regroupées
  const o = await create({
    items: [{ productId: beer.id, quantity: 1 }, { productId: beer.id, quantity: 2 }],
    paymentMethod: 'card',
    clientId: 'abc',
  });
  assert.equal(o.status, 201);
  assert.equal(o.json.total, 10.5);
  assert.equal(o.json.items.length, 1);

  // Renvoi du même clientId : même commande, pas de doublon
  const again = await create({ items: [{ productId: beer.id, quantity: 1 }], clientId: 'abc' });
  assert.equal(again.json.orderId, o.json.orderId);

  // Rupture : refusée en ligne, acceptée hors-ligne
  await t.call('PATCH', `/bar/products/${beer.id}/availability`, { token: manager, body: { available: false } });
  assert.equal((await create({ items: [{ productId: beer.id, quantity: 1 }] })).status, 409);
  assert.equal((await create({ items: [{ productId: beer.id, quantity: 1 }], offline: true })).status, 201);
  await t.call('PATCH', `/bar/products/${beer.id}/availability`, { token: manager, body: { available: true } });
});

test('récapitulatif : cache invalidé par les commandes et annulations', async () => {
  const summary = async () => (await t.call('GET', '/bar/summary/today', { token: manager })).json;
  const before = await summary();
  assert.equal(before.orderCount, 2);
  assert.equal(before.total, 14);
  await summary(); // lecture depuis le cache

  const o = await t.call('POST', '/bar/orders', { token: staff, body: { items: [{ productId: beer.id, quantity: 2 }] } });
  const afterCreate = await summary();
  assert.equal(afterCreate.orderCount, 3);
  assert.equal(afterCreate.total, 21);

  assert.equal((await t.call('DELETE', `/bar/orders/${o.json.orderId}`, { token: staff })).status, 200);
  const afterCancel = await summary();
  assert.equal(afterCancel.orderCount, 2);
  assert.equal(afterCancel.cancelledCount, 1);
  assert.equal(afterCancel.total, 14);
  assert.equal((await t.call('DELETE', `/bar/orders/${o.json.orderId}`, { token: staff })).status, 409);

  // Renommer un produit est visible immédiatement
  await t.call('PUT', `/bar/products/${beer.id}`, {
    token: manager, body: { name: 'Blonde bio', price: 3.5, category_id: beer.category_id, available: true },
  });
  assert.equal((await summary()).products[0].name, 'Blonde bio');
});

test('commandes concurrentes : aucune perte, aucune erreur', async () => {
  const results = await Promise.all(
    Array.from({ length: 30 }, (_, i) =>
      t.call('POST', '/bar/orders', {
        token: staff, body: { items: [{ productId: beer.id, quantity: 1 }], clientId: `c${i}` },
      })
    )
  );
  assert.ok(results.every(r => r.status === 201));
  const all = (await t.call('GET', '/bar/orders/all', { token: manager })).json;
  const count = Object.values(all).flat().length;
  assert.equal(count, 1 + 1 + 1 + 30); // commande, hors-ligne, annulée, 30 concurrentes
});

test('administration : suppression de commandes avec confirmation, isolation entre organisations', async () => {
  assert.equal((await t.call('DELETE', '/bar/orders', { token: manager, body: { confirm: 'x' } })).status, 400);
  const other = await t.login('autre', 'manager-pass');
  const empty = (await t.call('GET', '/autre/orders/all', { token: other })).json;
  assert.deepEqual(empty, {});
});

test('PWA : un manifeste par organisation, limité à sa page', async () => {
  const r = await t.call('GET', '/organizations/bar/manifest.webmanifest');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /manifest\+json/);
  assert.equal(r.json.start_url, '/bar/');
  assert.equal(r.json.scope, '/bar/');
  assert.equal(r.json.id, '/bar/');
  assert.match(r.json.name, /Org bar/);
  const other = (await t.call('GET', '/organizations/autre/manifest.webmanifest')).json;
  assert.equal(other.scope, '/autre/');
  assert.equal((await t.call('GET', '/organizations/inconnu/manifest.webmanifest')).status, 404);
});

test('réseau : API en no-store, organisation inconnue', async () => {
  const r = await t.call('GET', '/bar/products');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal((await t.call('GET', '/inconnu/products')).status, 404);
});
