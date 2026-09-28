// backend/routes/adminAuthRoutes.js
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createLimiter } = require('../utils/http');
const { jwtSecret, passwordHash, plainPassword, adminLoginConfigured, TOKEN_TTL } = require('../config/auth');

const router = express.Router();

// --- Limitation des tentatives : 5 échecs par IP sur 15 minutes ---
const limiter = createLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

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
  if (!adminLoginConfigured) {
    return res.status(503).json({
      error: 'Connexion administrateur non configurée : voir les journaux du serveur (ADMIN_PASSWORD_HASH).',
    });
  }

  const ip = req.ip;
  if (limiter.isBlocked(ip)) {
    return res.status(429).json({ error: `Trop de tentatives, réessayez dans ${limiter.minutes} minutes` });
  }

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe requis' });
  }

  if (!(await checkPassword(password))) {
    limiter.hit(ip);
    console.warn(`Échec de connexion administrateur (IP ${ip})`);
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  limiter.reset(ip);
  const token = jwt.sign({ role: 'admin' }, jwtSecret, { algorithm: 'HS256', expiresIn: TOKEN_TTL });
  return res.json({ token });
});

module.exports = router;
