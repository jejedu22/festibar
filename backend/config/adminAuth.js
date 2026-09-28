// backend/config/adminAuth.js
// Configuration de l'authentification de l'administrateur global
const crypto = require('crypto');

const TOKEN_TTL = process.env.ADMIN_TOKEN_TTL || '12h';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'change-me-in-prod') {
  // Secret aléatoire : les sessions admin sont invalidées à chaque redémarrage
  jwtSecret = crypto.randomBytes(48).toString('hex');
  console.warn('⚠️  JWT_SECRET absent ou par défaut : secret temporaire généré (sessions perdues au redémarrage).');
}

const passwordHash = process.env.ADMIN_PASSWORD_HASH || null;
const plainPassword = passwordHash ? null : process.env.ADMIN_PASSWORD || null;

if (!passwordHash && !plainPassword) {
  console.warn('⚠️  Aucun ADMIN_PASSWORD_HASH configuré : la connexion admin est désactivée.');
} else if (plainPassword) {
  console.warn('⚠️  ADMIN_PASSWORD en clair utilisé : préférez ADMIN_PASSWORD_HASH (node scripts/hash-password.js).');
}

module.exports = { jwtSecret, passwordHash, plainPassword, TOKEN_TTL };
