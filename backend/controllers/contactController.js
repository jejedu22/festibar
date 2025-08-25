// backend/controllers/contactController.js
const db = require('../config/database');
const nodemailer = require('nodemailer');
require('dotenv').config();

exports.createContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    // Stockage en base
    db.run(
      `INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)`,
      [name, email, message],
      async function (err) {
        if (err) {
          console.error('Erreur DB:', err);
          return res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
        }

        try {
          // Transporteur mail
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });

          // Envoi de l'email
          await transporter.sendMail({
          from: process.env.SMTP_USER, // simple email
          to: process.env.ADMIN_EMAIL,
          subject: 'Nouvelle demande d’accès à Festibar',
          text: `Nom : ${name}\nEmail : ${email}\nMessage :\n${message}`,
          });


          res.status(201).json({ success: true, message: 'Demande envoyée avec succès.' });
        } catch (mailErr) {
          console.error('Erreur envoi mail:', mailErr);
          res.status(500).json({ error: 'Demande enregistrée mais erreur email.' });
        }
      }
    );
  } catch (err) {
    console.error('Erreur contact:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
