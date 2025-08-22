// middlewares/withOrganization.js
const db = require('../config/database');

function withOrganization(req, res, next) {
  const { orgSlug } = req.params;

  db.get(`SELECT id FROM organizations WHERE slug = ?`, [orgSlug], (err, org) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!org) return res.status(404).json({ error: "Organisation non trouvée" });
    req.organizationId = org.id;
    next();
  });
}

module.exports = withOrganization;
