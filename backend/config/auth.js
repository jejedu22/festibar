// backend/config/auth.js
// Configuration de l'authentification (administrateur global et organisations)
const crypto = require('crypto');

const TOKEN_TTL = process.env.ADMIN_TOKEN_TTL || '12h';
const ORG_TOKEN_TTL = process.env.ORG_TOKEN_TTL || '24h';

// Durée pendant laquelle un serveur peut annuler une commande qu'il vient de saisir
const STAFF_CANCEL_MINUTES = Number.parseInt(process.env.STAFF_CANCEL_MINUTES || '15', 10);

// Longueur minimale des mots de passe d'organisation
const MIN_PASSWORD_LENGTH = 8;

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'change-me-in-prod') {
  // Secret aléatoire : les sessions admin sont invalidées à chaque redémarrage
  jwtSecret = crypto.randomBytes(48).toString('hex');
  console.warn('⚠️  JWT_SECRET absent ou par défaut : secret temporaire généré (sessions perdues au redémarrage).');
}

// Empreinte bcrypt : $2a$ / $2b$ / $2y$, coût sur 2 chiffres, 53 caractères de sel + hash
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

// Tolère les erreurs de recopie courantes : apostrophes/guillemets conservés, "$$" non convertis
function normalizeHash(raw) {
  if (!raw) return null;
  let v = raw.trim().replace(/^(['"])(.*)\1$/, '$2');
  if (v.includes('$$')) v = v.replace(/\$\$/g, '$');
  return v;
}

const rawHash = normalizeHash(process.env.ADMIN_PASSWORD_HASH);
let passwordHash = null;
if (rawHash) {
  if (BCRYPT_RE.test(rawHash)) {
    passwordHash = rawHash;
  } else {
    // Cas typique : Docker Compose a interprété les "$" de l'empreinte comme des variables
    console.error(
      `❌ ADMIN_PASSWORD_HASH invalide (${rawHash.length} caractères au lieu de 60) : empreinte tronquée ou mal copiée.\n` +
      "   Dans backend/.env.local, entourez-la d'apostrophes : ADMIN_PASSWORD_HASH='$2b$12$...'\n" +
      '   (sans apostrophes ou entre guillemets, Docker Compose remplace les "$..." par des variables vides).'
    );
  }
}
const plainPassword = passwordHash ? null : process.env.ADMIN_PASSWORD || null;
const adminLoginConfigured = !!(passwordHash || plainPassword);

if (!adminLoginConfigured) {
  console.warn('⚠️  Aucun mot de passe administrateur valide : la connexion admin est désactivée.');
} else if (plainPassword) {
  console.warn('⚠️  ADMIN_PASSWORD en clair utilisé : préférez ADMIN_PASSWORD_HASH (node scripts/hash-password.js).');
}

module.exports = {
  jwtSecret, passwordHash, plainPassword, adminLoginConfigured, TOKEN_TTL,
  ORG_TOKEN_TTL, STAFF_CANCEL_MINUTES, MIN_PASSWORD_LENGTH,
};
