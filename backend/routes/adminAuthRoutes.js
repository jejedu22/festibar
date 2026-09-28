// backend/routes/adminAuthRoutes.js
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { jwtSecret, passwordHash, plainPassword, TOKEN_TTL } = require('../config/adminAuth');

const router = express.Router();

// --- Limitation des tentatives : 5 échecs par IP sur 15 minutes ---
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map(); // ip -> { count, firstAt }

function isBlocked(ip) {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const entry = failedAttempts.get(ip);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAt: Date.now() });
  } else {
    entry.count++;
  }
}

async function checkPassword(password) {
  if (passwordHash) return bcrypt.compare(password, passwordHash);
  if (plainPassword) {
    // Comparaison en temps constant (sur des empreintes de même longueur)
    const a = crypto.createHash('sha256').update(password).digest();
    const b = crypto.createHash('sha256').update(plainPassword).digest();
    return crypto.timingSafeEqual(a, b);
  }
  return false;
}

// Endpoint d’auth admin : renvoie un jeton signé
router.post('/login', async (req, res) => {
  const ip = req.ip;
  if (isBlocked(ip)) {
    return res.status(429).json({ error: 'Trop de tentatives, réessayez dans 15 minutes' });
  }

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe requis' });
  }

  if (!(await checkPassword(password))) {
    recordFailure(ip);
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  failedAttempts.delete(ip);
  const token = jwt.sign({ role: 'admin' }, jwtSecret, { algorithm: 'HS256', expiresIn: TOKEN_TTL });
  return res.json({ token });
});

module.exports = router;
