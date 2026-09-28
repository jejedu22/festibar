// backend/routes/legalRoutes.js
// Informations des pages légales, configurées par variables d'environnement (LEGAL_*)
const express = require('express');
const router = express.Router();

const env = key => process.env[key] || null;

router.get('/', (req, res) => {
  res.json({
    editor: {
      name: env('LEGAL_EDITOR_NAME'),
      status: env('LEGAL_EDITOR_STATUS'),
      address: env('LEGAL_EDITOR_ADDRESS'),
      registration: env('LEGAL_EDITOR_REGISTRATION'),
      email: env('LEGAL_EDITOR_EMAIL'),
      phone: env('LEGAL_EDITOR_PHONE'),
      director: env('LEGAL_PUBLICATION_DIRECTOR'),
    },
    host: {
      name: env('LEGAL_HOST_NAME'),
      address: env('LEGAL_HOST_ADDRESS'),
      phone: env('LEGAL_HOST_PHONE'),
    },
    dpoEmail: env('LEGAL_PRIVACY_EMAIL') || env('LEGAL_EDITOR_EMAIL'),
    contactRetentionDays: Number.parseInt(process.env.CONTACT_RETENTION_DAYS || '365', 10),
  });
});

module.exports = router;
