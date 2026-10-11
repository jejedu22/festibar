// backend/scripts/totp-secret.js
// Génère le secret de la double authentification administrateur (ADMIN_TOTP_SECRET).
// Usage : node scripts/totp-secret.js
// Saisir ensuite le secret dans une application d'authentification (« saisir une clé de configuration »,
// type « basé sur l'heure »), ou ouvrir l'adresse otpauth:// avec une application qui la prend en charge.
const { generateSecret, otpauthUri } = require('../utils/totp');

const secret = generateSecret();
console.log(`ADMIN_TOTP_SECRET=${secret}`);
console.log('');
console.log('À saisir dans l’application d’authentification :');
console.log(`  clé : ${secret.match(/.{1,4}/g).join(' ')}  (basée sur l’heure, 6 chiffres, 30 s)`);
console.log(`  ou adresse : ${otpauthUri(secret)}`);
console.log('');
console.log('Ajoutez la ligne ADMIN_TOTP_SECRET=… à backend/.env.local puis : docker compose up -d');
console.log('Conservez le secret dans un gestionnaire de mots de passe : sans lui (ou sans l’application), retirez la variable pour désactiver la double authentification.');
