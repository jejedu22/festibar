// backend/controllers/organizationController.js
const db = require('../config/database');
const bcrypt = require('bcrypt');
const { serverError } = require('../utils/http');
const withOrganization = require('../middlewares/withOrganization');
const { MIN_PASSWORD_LENGTH } = require('../config/auth');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Slugs qui entreraient en conflit avec les routes de l'application
const RESERVED_SLUGS = ['admin', 'api', 'login', 'assets', 'mentions-legales', 'confidentialite', 'cgu', 'legal', 'config', 'contact', 'organizations'];

function validate({ name, slug, password, staff_password }, { requirePassword }) {
  if (typeof name !== 'string' || !name.trim() || name.length > 100) return 'Nom requis (100 caractères maximum)';
  if (typeof slug !== 'string' || !SLUG_RE.test(slug) || slug.length > 60) {
    return 'Slug invalide (minuscules, chiffres et tirets)';
  }
  if (RESERVED_SLUGS.includes(slug)) return 'Ce slug est réservé';
  if ((requirePassword || password) && (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH)) {
    return `Mot de passe gestionnaire : ${MIN_PASSWORD_LENGTH} caractères minimum`;
  }
  if (staff_password && (typeof staff_password !== 'string' || staff_password.length < MIN_PASSWORD_LENGTH)) {
    return `Mot de passe serveurs : ${MIN_PASSWORD_LENGTH} caractères minimum`;
  }
  if (staff_password && staff_password === password) {
    return 'Les mots de passe gestionnaire et serveurs doivent être différents';
  }
  return null;
}

function uniqueError(res, err) {
  if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Ce nom ou ce slug est déjà utilisé' });
  serverError(res, err);
}

// --- Liste des organisations (sans les empreintes de mots de passe) ---
exports.getAll = (req, res) => {
  db.all(
    'SELECT id, name, slug, staff_password IS NOT NULL AS has_staff_password FROM organizations ORDER BY name',
    (err, rows) => {
      if (err) return serverError(res, err);
      res.json(rows);
    }
  );
};

// --- Nom d'une organisation (public) ---
exports.getOne = (req, res) => {
  db.get(`SELECT name, slug FROM organizations WHERE id = ?`, [req.organizationId], (err, row) => {
    if (err) return serverError(res, err);
    if (!row) return res.status(404).json({ error: 'Organisation non trouvée' });
    res.json(row);
  });
};

// --- Créer une organisation ---
exports.create = async (req, res) => {
  const body = req.body || {};
  const error = validate(body, { requirePassword: true });
  if (error) return res.status(400).json({ error });

  try {
    const hash = await bcrypt.hash(body.password, 10);
    const staffHash = body.staff_password ? await bcrypt.hash(body.staff_password, 10) : null;
    const { lastID } = await db.runAsync(
      'INSERT INTO organizations (name, slug, password, staff_password) VALUES (?, ?, ?, ?)',
      [body.name.trim(), body.slug, hash, staffHash]
    );
    res.status(201).json({ id: lastID, name: body.name.trim(), slug: body.slug });
  } catch (err) {
    uniqueError(res, err);
  }
};

// --- Modifier une organisation (mots de passe optionnels : conservés s'ils ne sont pas fournis) ---
exports.update = async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const error = validate(body, { requirePassword: false });
  if (error) return res.status(400).json({ error });

  const fields = ['name = ?', 'slug = ?'];
  const params = [body.name.trim(), body.slug];
  try {
    if (body.password) {
      fields.push('password = ?');
      params.push(await bcrypt.hash(body.password, 10));
    }
    if (body.staff_password) {
      fields.push('staff_password = ?');
      params.push(await bcrypt.hash(body.staff_password, 10));
    } else if (body.remove_staff_password) {
      fields.push('staff_password = NULL');
    }
    params.push(id);

    const { changes } = await db.runAsync(`UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`, params);
    if (!changes) return res.status(404).json({ error: 'Organisation introuvable' });
    withOrganization.invalidate();
    res.json({ updated: changes });
  } catch (err) {
    uniqueError(res, err);
  }
};

// --- Supprimer une organisation ---
exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.getAsync(
      `SELECT (SELECT COUNT(*) FROM products WHERE organization_id = ?) +
              (SELECT COUNT(*) FROM orders WHERE organization_id = ?) AS count`,
      [id, id]
    );
    if (row.count > 0) {
      return res.status(409).json({ error: 'Organisation utilisée par des produits ou des commandes' });
    }
    await db.runAsync('DELETE FROM categories WHERE organization_id = ?', [id]);
    const { changes } = await db.runAsync('DELETE FROM organizations WHERE id = ?', [id]);
    withOrganization.invalidate();
    res.json({ deleted: changes });
  } catch (err) {
    serverError(res, err);
  }
};
