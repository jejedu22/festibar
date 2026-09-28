// backend/scripts/hash-password.js
// Génère l'empreinte bcrypt à placer dans ADMIN_PASSWORD_HASH
// Usage : node scripts/hash-password.js "mon-mot-de-passe"
const bcrypt = require('bcrypt');

const password = process.argv[2];
if (!password) {
  console.error('Usage : node scripts/hash-password.js "mon-mot-de-passe"');
  process.exit(1);
}
if (password.length < 12) {
  console.warn('⚠️  Mot de passe court : 12 caractères minimum recommandés.');
}

const hash = bcrypt.hashSync(password, 12);
console.log(`ADMIN_PASSWORD_HASH='${hash}'`);
