// Environnement de test : base SQLite temporaire, aucun email, pas de sauvegarde
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'festibar-test-'));
process.env.SQLITE_FILE = path.join(dir, 'test.db');
process.env.JWT_SECRET = 'test-secret';
process.env.BACKUP_INTERVAL_MINUTES = '0';

const bcrypt = require('bcrypt');
const app = require('../app');
const db = require('../config/database');

async function start() {
  await db.ready;
  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  async function call(method, url, { token, body, headers = {} } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* corps non JSON */ }
    return { status: res.status, json, headers: res.headers };
  }

  async function createOrg(slug, managerPwd = 'manager-pass', staffPwd = 'staff-pass') {
    await db.runAsync(
      'INSERT INTO organizations (name, slug, password, staff_password) VALUES (?, ?, ?, ?)',
      [`Org ${slug}`, slug, await bcrypt.hash(managerPwd, 4), await bcrypt.hash(staffPwd, 4)]
    );
  }

  async function login(slug, password) {
    const r = await call('POST', `/${slug}/login`, { body: { password } });
    return r.json?.token;
  }

  async function stop() {
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => db.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }

  return { call, createOrg, login, stop, db, base };
}

module.exports = { start };
