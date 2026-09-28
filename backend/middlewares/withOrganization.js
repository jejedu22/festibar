// backend/middlewares/withOrganization.js
const db = require('../config/database');
const { serverError } = require('../utils/http');

module.exports = (req, res, next) => {
  const slug = req.params.orgSlug;
  db.get('SELECT id FROM organizations WHERE slug = ?', [slug], (err, row) => {
    if (err) return serverError(res, err);
    if (!row) return res.status(404).json({ error: 'Organisation non trouvée' });
    req.organizationId = row.id;
    next();
  });
};
