// backend/middlewares/withOrganization.js
const db = require('../config/database');
const { serverError } = require('../utils/http');

// Cache slug → organisation (id et empreintes des mots de passe) : évite une requête SQL à chaque appel API.
// Invalidé par organizationController lors des créations / modifications / suppressions : un changement de
// mot de passe coupe donc aussitôt les sessions ouvertes avec l'ancien (voir orgAuth).
const TTL_MS = 60 * 1000;
const MAX_ENTRIES = 1000;
const cache = new Map(); // slug -> { id, creds, expires }

const SQL = 'SELECT id, password, staff_password FROM organizations WHERE slug = ?';

function remember(slug, row) {
  if (cache.size >= MAX_ENTRIES) cache.clear();
  const entry = { id: row.id, creds: { manager: row.password, staff: row.staff_password }, expires: Date.now() + TTL_MS };
  cache.set(slug, entry);
  return entry;
}

function middleware(req, res, next) {
  const slug = req.params.orgSlug;
  const hit = cache.get(slug);
  if (hit && hit.expires > Date.now()) {
    req.organizationId = hit.id;
    req.organizationCreds = hit.creds;
    return next();
  }
  db.get(SQL, [slug], (err, row) => {
    if (err) return serverError(res, err);
    if (!row) return res.status(404).json({ error: 'Organisation non trouvée' });
    const entry = remember(slug, row);
    req.organizationId = entry.id;
    req.organizationCreds = entry.creds;
    next();
  });
}

middleware.invalidate = () => cache.clear();

// Une structure existe-t-elle ? (même cache que le middleware ; sert à distinguer, côté serveur,
// une page de structure d'une adresse inexistante)
middleware.exists = async slug => {
  const hit = cache.get(slug);
  if (hit && hit.expires > Date.now()) return true;
  const row = await db.getAsync(SQL, [slug]);
  if (!row) return false;
  remember(slug, row);
  return true;
};

module.exports = middleware;
