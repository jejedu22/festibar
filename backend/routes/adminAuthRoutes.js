// backend/routes/adminAuthRoutes.js
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const adminAuth = require('../middlewares/adminAuth');
const { createLimiter, serverError } = require('../utils/http');
const { verifyPassword, sendBusy } = require('../utils/password');
const { verifyTotp } = require('../utils/totp');
const {
  jwtSecret, passwordHash, plainPassword, adminLoginConfigured, totpSecret, adminFingerprint, TOKEN_TTL,
} = require('../config/auth');

const router = express.Router();

// --- Limitation des tentatives ---
// Par IP : 5 échecs sur 15 minutes. Global : 30 échecs sur 15 minutes toutes IP confondues, contre
// une attaque répartie sur de nombreuses adresses (le mot de passe est unique, il n'y a pas de compte à cibler).
const ipLimiter = createLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
const globalLimiter = createLimiter({ max: 30, windowMs: 15 * 60 * 1000 });
const GLOBAL_KEY = 'all';

async function checkPassword(password) {
  if (passwordHash) return verifyPassword(password, passwordHash);
  if (plainPassword) {
    // Comparaison en temps constant (sur des empreintes de même longueur)
    const a = crypto.createHash('sha256').update(password).digest();
    const b = crypto.createHash('sha256').update(plainPassword).digest();
    return crypto.timingSafeEqual(a, b);
  }
  return false;
}

// Un code à usage unique ne sert qu'une fois : le dernier pas accepté est mémorisé
let lastTotpStep = 0;

// Indique à la page de connexion s'il faut demander un code (information publique, sans effet sur la sécurité)
router.get('/options', (req, res) => res.json({ totp: !!totpSecret }));

// Endpoint d’auth admin : renvoie un jeton signé
router.post('/login', async (req, res) => {
  if (!adminLoginConfigured) {
    return res.status(503).json({
      error: 'Connexion administrateur non configurée : voir les journaux du serveur (ADMIN_PASSWORD_HASH).',
    });
  }

  const ip = req.ip;
  if (ipLimiter.isBlocked(ip) || globalLimiter.isBlocked(GLOBAL_KEY)) {
    console.warn(`Connexion administrateur bloquée (IP ${ip}) : trop d'échecs`);
    return res.status(429).json({ error: `Trop de tentatives, réessayez dans ${ipLimiter.minutes} minutes` });
  }

  const { password, code } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe requis' });
  }
  if (totpSecret && (!code || typeof code !== 'string')) {
    return res.status(400).json({ error: 'Code de l’application d’authentification requis' });
  }

  let valid;
  try {
    valid = await checkPassword(password);
  } catch (err) {
    if (err.code === 'GATE_FULL') return sendBusy(res);
    throw err;
  }

  // Le code est toujours contrôlé (même si le mot de passe est faux) : la réponse ne révèle pas lequel des deux est faux
  let step = null;
  if (totpSecret) {
    step = verifyTotp(totpSecret, code);
    if (step !== null && step <= lastTotpStep) step = null; // code déjà utilisé
  }

  if (!valid || (totpSecret && step === null)) {
    ipLimiter.hit(ip);
    globalLimiter.hit(GLOBAL_KEY);
    console.warn(`Échec de connexion administrateur (IP ${ip})`);
    return res.status(401).json({ error: totpSecret ? 'Mot de passe ou code incorrect' : 'Mot de passe incorrect' });
  }

  if (step !== null) lastTotpStep = step;
  ipLimiter.reset(ip);
  console.info(`Connexion administrateur réussie (IP ${ip})`);
  const token = jwt.sign({ role: 'admin', fp: adminFingerprint }, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL,
    audience: adminAuth.AUDIENCE,
    jwtid: crypto.randomUUID(),
  });
  return res.json({ token });
});

// Déconnexion : la session est révoquée côté serveur (un jeton copié ne reste pas utilisable)
router.post('/logout', adminAuth, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM revoked_admin_tokens WHERE expires_at < ?', [Math.floor(Date.now() / 1000)]);
    await db.runAsync('INSERT OR IGNORE INTO revoked_admin_tokens (jti, expires_at) VALUES (?, ?)', [req.admin.jti, req.admin.exp]);
    console.info(`Déconnexion administrateur (IP ${req.ip})`);
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
