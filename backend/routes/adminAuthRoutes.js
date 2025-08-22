// backend/routes/adminAuthRoutes.js
const express = require('express');
const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Endpoint d’auth admin
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis' });
  }

  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

module.exports = router;

