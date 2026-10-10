process.env.BCRYPT_CONCURRENCY = '2'; // lu au chargement du module

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { verifyPassword } = require('../utils/password');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Compte les calculs bcrypt réellement exécutés et la concurrence maximale observée
function spyOnBcrypt(delayMs = 0) {
  const original = bcrypt.compare;
  const stats = { calls: 0, running: 0, peak: 0 };
  mock.method(bcrypt, 'compare', async (...args) => {
    stats.calls++; stats.running++; stats.peak = Math.max(stats.peak, stats.running);
    if (delayMs) await sleep(delayMs);
    try { return await original(...args); } finally { stats.running--; }
  });
  return stats;
}

test('mot de passe : réussites et échecs sont mémorisés, un seul calcul bcrypt', async () => {
  const hash = await bcrypt.hash('secret-un', 4);
  const stats = spyOnBcrypt();
  assert.equal(await verifyPassword('secret-un', hash), true);
  assert.equal(await verifyPassword('secret-un', hash), true);
  assert.equal(await verifyPassword('mauvais', hash), false);
  assert.equal(await verifyPassword('mauvais', hash), false);
  assert.equal(stats.calls, 2); // un pour le bon mot de passe, un pour le mauvais
  mock.restoreAll();
});

test('mot de passe : des vérifications identiques simultanées partagent un seul calcul', async () => {
  const hash = await bcrypt.hash('secret-deux', 4);
  const stats = spyOnBcrypt(20);
  const results = await Promise.all(Array.from({ length: 40 }, () => verifyPassword('secret-deux', hash)));
  assert.ok(results.every(r => r === true));
  assert.equal(stats.calls, 1);
  mock.restoreAll();
});

test('mot de passe : changer d’empreinte invalide l’ancien résultat', async () => {
  const oldHash = await bcrypt.hash('ancien-mdp', 4);
  const newHash = await bcrypt.hash('nouveau-mdp', 4);
  assert.equal(await verifyPassword('ancien-mdp', oldHash), true);
  // Même mot de passe, mais l'organisation a maintenant une autre empreinte : jamais de réutilisation
  assert.equal(await verifyPassword('ancien-mdp', newHash), false);
  assert.equal(await verifyPassword('nouveau-mdp', newHash), true);
});

test('mot de passe : au plus BCRYPT_CONCURRENCY calculs en parallèle', async () => {
  const hash = await bcrypt.hash('un-mot-de-passe', 4);
  const stats = spyOnBcrypt(15);
  const guesses = Array.from({ length: 12 }, (_, i) => `essai-${i}`); // tous différents : aucun partage possible
  const results = await Promise.all(guesses.map(g => verifyPassword(g, hash)));
  assert.ok(results.every(r => r === false));
  assert.equal(stats.calls, 12);
  assert.equal(stats.peak, 2);
  mock.restoreAll();
});

test('mot de passe : empreinte absente ou valeur invalide → faux, sans calcul', async () => {
  const stats = spyOnBcrypt();
  assert.equal(await verifyPassword('x', null), false);
  assert.equal(await verifyPassword(undefined, '$2b$04$abcdefghijklmnopqrstuuvwxyz0123456789ABCDEFGHIJKLMNO'), false);
  assert.equal(stats.calls, 0);
  mock.restoreAll();
});
