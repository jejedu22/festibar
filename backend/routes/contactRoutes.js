// backend/routes/contactRoutes.js
const express = require('express');
const { createContact } = require('../controllers/contactController');

const router = express.Router();

// POST /api/contact
router.post('/', createContact);

module.exports = router;
