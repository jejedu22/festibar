// Doit précéder le chargement de l'application : la configuration d'authentification est lue au démarrage
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('motdepasse-admin-solide', 4);
process.env.ADMIN_TOTP_SECRET = TOTP_SECRET;
process.env.TRUST_PROXY = '1'; // adresse client lue dans x-forwarded-for : une « IP » par test

const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');
const { base32Decode, codeForStep, verifyTotp, STEP_SECONDS } = require('../utils/totp');

const PASSWORD = 'motdepasse-admin-solide';
let t;

// Horloge simulée : un code ne sert qu'une fois, chaque connexion réussie avance donc d'un pas de 30 s
let fakeNow = Date.now();
mock.method(Date, 'now', () => fakeNow);
function freshCode() {
  fakeNow += STEP_SECONDS * 1000;
  return codeForStep(base32Decode(TOTP_SECRET), Math.floor(fakeNow / 1000 / STEP_SECONDS));
}

before(async () => { t = await start(); });
after(() => t.stop());

// Chaque test part d'IP différentes : le limiteur par IP est testé à part
let ipCounter = 0;
const login = body => t.call('POST', '/admin/auth/login', { body, headers: { 'x-forwarded-for': `10.9.${++ipCounter}.1` } });

test('totp : vecteur de la RFC 6238 et tolérance d’un pas', () => {
  const key = Buffer.from('12345678901234567890');
  assert.equal(codeForStep(key, Math.floor(59 / 30)), '287082'); // RFC 6238, annexe B (59 s, 6 derniers chiffres de 94287082)
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // base32 de la clé ci-dessus
  assert.equal(verifyTotp(secret, '287082', 59_000), 1);
  assert.equal(verifyTotp(secret, '287082', 59_000 + 30_000), 1);   // un pas plus tard : toléré
  assert.equal(verifyTotp(secret, '287082', 59_000 + 90_000), null); // trois pas plus tard : refusé
  assert.equal(verifyTotp(secret, 'abcdef'), null);
});

test('options : indique que la double authentification est demandée', async () => {
  assert.deepEqual((await t.call('GET', '/admin/auth/options')).json, { totp: true });
});

test('connexion : refusée sans code, avec un mauvais code ou un mauvais mot de passe, sans révéler lequel', async () => {
  assert.equal((await login({ password: PASSWORD })).status, 400);
  const badCode = await login({ password: PASSWORD, code: '000000' });
  const badPassword = await login({ password: 'mauvais', code: freshCode() });
  assert.equal(badCode.status, 401);
  assert.equal(badPassword.status, 401);
  assert.equal(badCode.json.error, badPassword.json.error);
});

test('connexion : mot de passe + code valides ouvrent une session, un code ne sert qu’une fois', async () => {
  const code = freshCode();
  const ok = await login({ password: PASSWORD, code });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  const replay = await login({ password: PASSWORD, code });
  assert.equal(replay.status, 401);
  assert.equal((await t.call('GET', '/admin/organizations', { token: ok.json.token })).status, 200);
});

test('session : refusée sans jeton, avec un jeton d’organisation, d’une autre audience ou d’une autre empreinte', async () => {
  assert.equal((await t.call('GET', '/admin/organizations')).status, 401);
  const forge = options => jwt.sign({ role: 'admin', ...options.claims }, 'test-secret', { algorithm: 'HS256', expiresIn: '1h', jwtid: 'x', ...options.sign });
  // Même secret et rôle admin, mais sans l'audience ni l'empreinte attendues (ancien format de jeton)
  assert.equal((await t.call('GET', '/admin/organizations', { token: forge({ claims: {}, sign: {} }) })).status, 401);
  assert.equal((await t.call('GET', '/admin/organizations', { token: forge({ claims: { fp: 'x' }, sign: { audience: 'festibar-admin' } }) })).status, 401);
});

test('déconnexion : le jeton est révoqué côté serveur', async () => {
  const { json } = await login({ password: PASSWORD, code: freshCode() });
  assert.equal((await t.call('GET', '/admin/organizations', { token: json.token })).status, 200);
  assert.equal((await t.call('POST', '/admin/auth/logout', { token: json.token })).status, 200);
  assert.equal((await t.call('GET', '/admin/organizations', { token: json.token })).status, 401);
  assert.equal((await t.call('POST', '/admin/auth/logout', { token: json.token })).status, 401);
});

test('limitation : 5 échecs bloquent l’adresse, même avec les bons identifiants ensuite', async () => {
  const headers = { 'x-forwarded-for': '10.250.0.1' };
  const attempt = body => t.call('POST', '/admin/auth/login', { body, headers });
  for (let i = 0; i < 5; i++) assert.equal((await attempt({ password: 'faux', code: '000000' })).status, 401);
  assert.equal((await attempt({ password: PASSWORD, code: freshCode() })).status, 429);
});
