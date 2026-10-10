// backend/controllers/authController.js
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const { jwtSecret, ORG_TOKEN_TTL } = require('../config/auth');
const { serverError, createLimiter } = require('../utils/http');
const { verifyPassword, sendBusy } = require('../utils/password');

// 10 échecs par IP et par organisation sur 15 minutes
const limiter = createLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

exports.login = async (req, res) => {
  const slug = req.params.orgSlug;
  const { password } = req.body || {};
  const key = `${req.ip}|${slug}`;

  if (limiter.isBlocked(key)) {
    return res.status(429).json({ error: `Trop de tentatives, réessayez dans ${limiter.minutes} minutes` });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe requis' });
  }

  try {
    const org = await db.getAsync(
      `SELECT id, name, slug, password, staff_password FROM organizations WHERE slug = ?`,
      [slug]
    );
    if (!org) return res.status(404).json({ error: 'Organisation non trouvée' });

    // Mot de passe gestionnaire, sinon mot de passe serveurs
    let role = null;
    if (await verifyPassword(password, org.password)) role = 'manager';
    else if (org.staff_password && (await verifyPassword(password, org.staff_password))) role = 'staff';

    if (!role) {
      limiter.hit(key);
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    limiter.reset(key);
    const token = jwt.sign({ role, orgId: org.id, slug: org.slug }, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: ORG_TOKEN_TTL,
    });
    res.json({ token, role, id: org.id, name: org.name, slug: org.slug });
  } catch (err) {
    if (err.code === 'GATE_FULL') return sendBusy(res);
    serverError(res, err);
  }
};
