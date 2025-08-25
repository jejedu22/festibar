// backend/middlewares/withOrganization.js
const db = require('../config/database');

module.exports = (req, res, next) => {
  const slug = req.params.orgSlug;
  db.get('SELECT id FROM organizations WHERE slug = ?', [slug], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Organisation non trouvée' });
    req.organizationId = row.id;
    next();
  });
};
