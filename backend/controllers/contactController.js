// backend/controllers/contactController.js
const db = require('../config/database');
const nodemailer = require('nodemailer');
const { serverError, createLimiter } = require('../utils/http');
require('dotenv').config();

// 3 demandes par IP et par heure
const limiter = createLimiter({ max: 3, windowMs: 60 * 60 * 1000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Durée de conservation des demandes (RGPD), en jours
const RETENTION_DAYS = Number.parseInt(process.env.CONTACT_RETENTION_DAYS || '365', 10);

function purgeOldContacts() {
  db.runAsync(`DELETE FROM contacts WHERE created_at < datetime('now', ?)`, [`-${RETENTION_DAYS} days`])
    .then(({ changes }) => changes && console.log(`🧹 ${changes} demande(s) de contact expirée(s) supprimée(s)`))
    .catch(err => console.error('Purge contacts :', err));
}
db.ready.then(purgeOldContacts);
setInterval(purgeOldContacts, 24 * 3600 * 1000).unref();

exports.createContact = async (req, res) => {
  const { name, email, message, website } = req.body || {};

  // Champ piège invisible : rempli uniquement par les robots
  if (website) return res.status(201).json({ success: true, message: 'Demande envoyée avec succès.' });

  if (limiter.isBlocked(req.ip)) {
    return res.status(429).json({ error: 'Trop de demandes, réessayez plus tard.' });
  }

  const clean = v => (typeof v === 'string' ? v.trim() : '');
  const data = { name: clean(name), email: clean(email), message: clean(message) };
  if (!data.name || !data.email || !data.message) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }
  if (data.name.length > 100 || data.email.length > 200 || data.message.length > 2000) {
    return res.status(400).json({ error: 'Un des champs est trop long.' });
  }
  if (!EMAIL_RE.test(data.email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  limiter.hit(req.ip);

  try {
    await db.runAsync(`INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)`, [data.name, data.email, data.message]);
  } catch (err) {
    return serverError(res, err);
  }

  // Réponse immédiate : l'email est envoyé en arrière-plan (la demande est déjà enregistrée)
  res.status(201).json({ success: true, message: 'Demande envoyée avec succès.' });
  notifyAdmin(data);
};

function notifyAdmin(data) {
  if (!process.env.SMTP_HOST || !process.env.ADMIN_EMAIL) return;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
  });
  transporter
    .sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL,
      replyTo: data.email,
      subject: 'Nouvelle demande d’accès à Festibar',
      text: `Nom : ${data.name}\nEmail : ${data.email}\nMessage :\n${data.message}`,
    })
    .catch(err => console.error('Erreur envoi mail:', err));
}
