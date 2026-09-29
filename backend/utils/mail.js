// backend/utils/mail.js
// Envoi d'emails (notification des demandes d'accès), configuré par les variables SMTP_*
const nodemailer = require('nodemailer');

function mailConfig() {
  const env = process.env;
  return {
    host: env.SMTP_HOST || null,
    port: Number.parseInt(env.SMTP_PORT || '587', 10),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER || null,
    pass: env.SMTP_PASS || null,
    // Expéditeur : SMTP_FROM, sinon le login SMTP s'il ressemble à une adresse email
    from: env.SMTP_FROM || (env.SMTP_USER && env.SMTP_USER.includes('@') ? env.SMTP_USER : null),
    to: env.ADMIN_EMAIL || null,
  };
}

// Ce qui manque pour pouvoir envoyer (liste vide = configuration complète)
function missingSettings(cfg = mailConfig()) {
  const missing = [];
  if (!cfg.host) missing.push('SMTP_HOST');
  if (!cfg.to) missing.push('ADMIN_EMAIL');
  if (!cfg.from) missing.push('SMTP_FROM (ou un SMTP_USER qui soit une adresse email)');
  return missing;
}

function createTransport(cfg = mailConfig()) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    // Pas d'authentification si aucun login (relais SMTP local, par exemple)
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

// Envoie un email à l'administrateur ; renvoie les infos d'envoi ou lève une erreur
async function sendToAdmin({ subject, text, replyTo }) {
  const cfg = mailConfig();
  const missing = missingSettings(cfg);
  if (missing.length) throw new Error(`configuration email incomplète : ${missing.join(', ')}`);
  return createTransport(cfg).sendMail({ from: cfg.from, to: cfg.to, replyTo, subject, text });
}

// Explication lisible des erreurs SMTP les plus courantes
function explain(err) {
  if (err.code === 'EAUTH') return 'identifiant ou mot de passe SMTP refusé (SMTP_USER / SMTP_PASS)';
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ESOCKET' || err.code === 'EDNS') {
    const { host, port } = mailConfig();
    return `serveur SMTP injoignable (${host}:${port}) : vérifier SMTP_HOST, SMTP_PORT, SMTP_SECURE et le pare-feu`;
  }
  if (err.code === 'EENVELOPE') return 'adresse d’expéditeur ou de destinataire refusée (SMTP_FROM / ADMIN_EMAIL)';
  return err.message;
}

function logStatusAtStartup() {
  const missing = missingSettings();
  if (missing.length) {
    console.warn(`⚠️  Emails désactivés (demandes d'accès enregistrées en base uniquement) : manque ${missing.join(', ')}.`);
  } else {
    const c = mailConfig();
    console.log(`📧 Emails activés : ${c.host}:${c.port}${c.secure ? ' (TLS)' : ''} → ${c.to}`);
  }
}

module.exports = { mailConfig, missingSettings, createTransport, sendToAdmin, explain, logStatusAtStartup };
