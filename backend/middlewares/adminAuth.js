// backend/middlewares/adminAuth.js
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

// Vérifie le jeton "Authorization: Bearer <token>" émis par /api/admin/auth/login
module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentification admin requise' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    if (payload.role !== 'admin') throw new Error('rôle invalide');
    next();
  } catch {
    return res.status(401).json({ error: 'Session admin invalide ou expirée' });
  }
};
