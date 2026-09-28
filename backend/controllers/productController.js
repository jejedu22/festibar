// backend/controllers/productController.js
const db = require('../config/database');
const { serverError } = require('../utils/http');

// Valide et normalise les champs d'un produit ; renvoie un message d'erreur ou null
function parseProduct(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const price = Number(body.price);
  if (!name || name.length > 100) return { error: 'Nom requis (100 caractères maximum)' };
  if (!Number.isFinite(price) || price < 0 || price > 10000) return { error: 'Prix invalide' };
  const categoryId = body.category_id ? Number(body.category_id) : null;
  if (categoryId !== null && !Number.isInteger(categoryId)) return { error: 'Catégorie invalide' };
  return { name, price: Math.round(price * 100) / 100, categoryId, available: body.available ? 1 : 0 };
}

async function checkCategory(orgId, categoryId) {
  if (categoryId === null) return true;
  return !!(await db.getAsync(`SELECT id FROM categories WHERE id = ? AND organization_id = ?`, [categoryId, orgId]));
}

exports.getAll = (req, res) => {
  const orgId = req.organizationId;
  const query = `
    SELECT p.id, p.name, p.price, p.category_id, p.available, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.organization_id = ?
    ORDER BY c.name, p.name
  `;
  db.all(query, [orgId], (err, rows) => {
    if (err) return serverError(res, err);
    res.json(rows);
  });
};

exports.create = async (req, res) => {
  const orgId = req.organizationId;
  const p = parseProduct(req.body);
  if (p.error) return res.status(400).json({ error: p.error });

  try {
    if (!(await checkCategory(orgId, p.categoryId))) return res.status(400).json({ error: 'Catégorie invalide' });
    const { lastID } = await db.runAsync(
      `INSERT INTO products (organization_id, name, price, category_id, available) VALUES (?, ?, ?, ?, ?)`,
      [orgId, p.name, p.price, p.categoryId, p.available]
    );
    res.status(201).json({ id: lastID, name: p.name, price: p.price, category_id: p.categoryId, available: p.available });
  } catch (err) {
    serverError(res, err);
  }
};

exports.update = async (req, res) => {
  const orgId = req.organizationId;
  const p = parseProduct(req.body);
  if (p.error) return res.status(400).json({ error: p.error });

  try {
    if (!(await checkCategory(orgId, p.categoryId))) return res.status(400).json({ error: 'Catégorie invalide' });
    const { changes } = await db.runAsync(
      `UPDATE products SET name = ?, price = ?, category_id = ?, available = ?
       WHERE id = ? AND organization_id = ?`,
      [p.name, p.price, p.categoryId, p.available, req.params.id, orgId]
    );
    if (!changes) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ updated: changes });
  } catch (err) {
    serverError(res, err);
  }
};

// Changement rapide de disponibilité (rupture de stock)
exports.setAvailability = async (req, res) => {
  try {
    const { changes } = await db.runAsync(
      `UPDATE products SET available = ? WHERE id = ? AND organization_id = ?`,
      [req.body?.available ? 1 : 0, req.params.id, req.organizationId]
    );
    if (!changes) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ updated: changes });
  } catch (err) {
    serverError(res, err);
  }
};

exports.remove = async (req, res) => {
  const orgId = req.organizationId;
  try {
    const sold = await db.getAsync(`SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?`, [req.params.id]);
    if (sold.count > 0) {
      return res.status(409).json({
        error: 'Ce produit a déjà été vendu : marquez-le plutôt comme indisponible pour conserver l’historique.',
      });
    }
    const { changes } = await db.runAsync(`DELETE FROM products WHERE id = ? AND organization_id = ?`, [req.params.id, orgId]);
    res.json({ deleted: changes });
  } catch (err) {
    serverError(res, err);
  }
};
