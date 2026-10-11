// backend/middlewares/adminAuth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { jwtSecret, adminFingerprint } = require('../config/auth');

const AUDIENCE = 'festibar-admin';

// Vérifie le jeton "Authorization: Bearer <token>" émis par /api/admin/auth/login :
// signature, audience, empreinte des identifiants (mot de passe / double authentification inchangés)
// et session non révoquée par une déconnexion.
async function verifyAdminToken(token) {
  const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], audience: AUDIENCE });
  if (payload.role !== 'admin' || payload.fp !== adminFingerprint || !payload.jti) throw new Error('jeton invalide');
  if (await db.getAsync('SELECT 1 AS revoked FROM revoked_admin_tokens WHERE jti = ?', [payload.jti])) {
    throw new Error('session révoquée');
  }
  return payload;
}

async function adminAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentification admin requise' });
  }
  try {
    req.admin = await verifyAdminToken(token);
  } catch {
    return res.status(401).json({ error: 'Session admin invalide ou expirée' });
  }
  next();
}

adminAuth.AUDIENCE = AUDIENCE;
module.exports = adminAuth;
