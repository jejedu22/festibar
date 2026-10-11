// backend/utils/totp.js
// Code à usage unique (TOTP, RFC 6238) compatible avec les applications d'authentification
// (Google Authenticator, Aegis, FreeOTP, 1Password, Bitwarden…) : HMAC-SHA1, 6 chiffres, pas de 30 s.
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

// Retourne null si la chaîne n'est pas du base32 valide
function base32Decode(text) {
  const clean = String(text).toUpperCase().replace(/[\s=-]/g, '');
  if (!clean || /[^A-Z2-7]/.test(clean)) return null;
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20)); // 160 bits, taille recommandée par la RFC 4226
}

function codeForStep(key, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

// Vérifie un code en tolérant un pas de décalage d'horloge de chaque côté.
// Retourne le pas validé (pour refuser le rejeu d'un code déjà utilisé) ou null.
function verifyTotp(secret, code, now = Date.now()) {
  const key = base32Decode(secret);
  const given = String(code || '').replace(/\s/g, '');
  if (!key || !/^\d{6}$/.test(given)) return null;
  const current = Math.floor(now / 1000 / STEP_SECONDS);
  let matched = null;
  for (const step of [current - 1, current, current + 1]) {
    const expected = Buffer.from(codeForStep(key, step));
    // Tous les pas sont comparés, en temps constant
    if (crypto.timingSafeEqual(expected, Buffer.from(given))) matched = step;
  }
  return matched;
}

function otpauthUri(secret, account = 'administrateur', issuer = 'Festibar') {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

module.exports = { generateSecret, verifyTotp, otpauthUri, base32Decode, codeForStep, STEP_SECONDS };
