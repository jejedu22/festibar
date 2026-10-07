// backend/middlewares/withOrganization.js
const db = require('../config/database');
const { serverError } = require('../utils/http');

// Cache slug → id : évite une requête SQL à chaque appel API.
// Invalidé par organizationController lors des créations / modifications / suppressions.
const TTL_MS = 60 * 1000;
const MAX_ENTRIES = 1000;
const cache = new Map(); // slug -> { id, expires }

function middleware(req, res, next) {
  const slug = req.params.orgSlug;
  const hit = cache.get(slug);
  if (hit && hit.expires > Date.now()) {
    req.organizationId = hit.id;
    return next();
  }
  db.get('SELECT id FROM organizations WHERE slug = ?', [slug], (err, row) => {
    if (err) return serverError(res, err);
    if (!row) return res.status(404).json({ error: 'Organisation non trouvée' });
    if (cache.size >= MAX_ENTRIES) cache.clear();
    cache.set(slug, { id: row.id, expires: Date.now() + TTL_MS });
    req.organizationId = row.id;
    next();
  });
}

middleware.invalidate = () => cache.clear();

module.exports = middleware;
