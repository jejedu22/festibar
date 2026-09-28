// backend/controllers/categoryController.js
const db = require('../config/database');
const { serverError } = require('../utils/http');

function parseName(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  return name && name.length <= 60 ? name : null;
}

function uniqueError(res, err) {
  if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Cette catégorie existe déjà' });
  serverError(res, err);
}

exports.getAll = (req, res) => {
  const orgId = req.organizationId;
  db.all(`SELECT * FROM categories WHERE organization_id = ? ORDER BY sort_order ASC, id ASC`, [orgId], (err, rows) => {
    if (err) return serverError(res, err);
    res.json(rows);
  });
};

exports.create = async (req, res) => {
  const orgId = req.organizationId;
  const name = parseName(req.body);
  if (!name) return res.status(400).json({ error: 'Nom requis (60 caractères maximum)' });

  try {
    const { lastID } = await db.runAsync(
      `INSERT INTO categories (organization_id, name, sort_order)
       VALUES (?, ?, (SELECT IFNULL(MAX(sort_order), 0) + 1 FROM categories WHERE organization_id = ?))`,
      [orgId, name, orgId]
    );
    res.status(201).json({ id: lastID, name });
  } catch (err) {
    uniqueError(res, err);
  }
};

exports.remove = async (req, res) => {
  const orgId = req.organizationId;
  const categoryId = req.params.id;

  try {
    const row = await db.getAsync(
      `SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND organization_id = ?`,
      [categoryId, orgId]
    );
    if (row.count > 0) {
      return res.status(409).json({ error: 'Impossible de supprimer une catégorie utilisée par des produits.' });
    }
    const { changes } = await db.runAsync(`DELETE FROM categories WHERE id = ? AND organization_id = ?`, [categoryId, orgId]);
    res.json({ deleted: changes });
  } catch (err) {
    serverError(res, err);
  }
};

exports.update = async (req, res) => {
  const orgId = req.organizationId;
  const name = parseName(req.body);
  if (!name) return res.status(400).json({ error: 'Nom requis (60 caractères maximum)' });

  try {
    const { changes } = await db.runAsync(
      `UPDATE categories SET name = ? WHERE id = ? AND organization_id = ?`,
      [name, req.params.id, orgId]
    );
    res.json({ updated: changes });
  } catch (err) {
    uniqueError(res, err);
  }
};

exports.updateOrder = async (req, res) => {
  const orgId = req.organizationId;
  const { order } = req.body || {};
  if (!Array.isArray(order) || order.some(c => !Number.isInteger(c?.id) || !Number.isInteger(c?.sort_order))) {
    return res.status(400).json({ error: 'Ordre invalide' });
  }

  try {
    let updated = 0;
    for (const cat of order) {
      const { changes } = await db.runAsync(
        `UPDATE categories SET sort_order = ? WHERE id = ? AND organization_id = ?`,
        [cat.sort_order, cat.id, orgId]
      );
      updated += changes;
    }
    res.json({ success: true, updated });
  } catch (err) {
    serverError(res, err);
  }
};
