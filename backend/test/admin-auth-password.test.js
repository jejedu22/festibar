// Sans double authentification : le mot de passe seul suffit, mais les protections restent actives
const bcrypt = require('bcrypt');
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('motdepasse-admin-solide', 4);
delete process.env.ADMIN_TOTP_SECRET;
process.env.TRUST_PROXY = '1';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

let t;
before(async () => { t = await start(); });
after(() => t.stop());

let n = 0;
const login = password => t.call('POST', '/admin/auth/login', { body: { password }, headers: { 'x-forwarded-for': `10.8.${Math.floor(++n / 250)}.${n % 250}` } });

test('mot de passe seul : session ouverte, double authentification non demandée', async () => {
  assert.deepEqual((await t.call('GET', '/admin/auth/options')).json, { totp: false });
  const ok = await login('motdepasse-admin-solide');
  assert.equal(ok.status, 200);
  assert.equal((await t.call('GET', '/admin/organizations', { token: ok.json.token })).status, 200);
  assert.equal((await login('faux')).json.error, 'Mot de passe incorrect');
});

test('attaque répartie : 30 échecs depuis des adresses différentes bloquent aussi les adresses neuves', async () => {
  for (let i = 0; i < 29; i++) assert.equal((await login('faux')).status, 401); // 1 échec déjà compté plus haut
  const blocked = await login('motdepasse-admin-solide');
  assert.equal(blocked.status, 429);
});
