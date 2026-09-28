// backend/routes/configRoutes.js
// Paramètres publics utiles à l'affichage côté frontend
const express = require('express');
const { TIMEZONE } = require('../utils/time');
const { STAFF_CANCEL_MINUTES } = require('../config/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    timezone: TIMEZONE,
    serviceDayStartHour: Number.parseInt(process.env.SERVICE_DAY_START_HOUR ?? '6', 10) || 0,
    staffCancelMinutes: STAFF_CANCEL_MINUTES,
  });
});

module.exports = router;
