// backend/controllers/categoryController.js
const db = require('../config/database');

exports.getAll = (req, res) => {
  const orgId = req.organizationId;
  db.all(`SELECT * FROM categories WHERE organization_id = ? ORDER BY sort_order ASC`, [orgId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.create = (req, res) => {
  const orgId = req.organizationId;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  db.run(
    `INSERT INTO categories (organization_id, name, sort_order) VALUES (?, ?, (SELECT IFNULL(MAX(sort_order), 0) + 1 FROM categories WHERE organization_id = ?))`,
    [orgId, name, orgId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name });
    }
  );
};

exports.remove = (req, res) => {
  const orgId = req.organizationId;
  const categoryId = req.params.id;

  db.get(
    `SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND organization_id = ?`,
    [categoryId, orgId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row.count > 0) {
        return res.status(400).json({ error: "Impossible de supprimer une catégorie utilisée par des produits." });
      }

      db.run(
        `DELETE FROM categories WHERE id = ? AND organization_id = ?`,
        [categoryId, orgId],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ deleted: this.changes });
        }
      );
    }
  );
};

exports.update = (req, res) => {
  const orgId = req.organizationId;
  const { name } = req.body;

  db.run(
    `UPDATE categories
     SET name = ?
     WHERE id = ? AND organization_id = ?`,
    [name, req.params.id, orgId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
};

exports.updateOrder = (req, res) => {
  const orgId = req.organizationId;
  const { order } = req.body;

  console.log("updateOrder called with:", order, "orgId:", orgId);

  const stmt = db.prepare(
    `UPDATE categories SET sort_order = ? WHERE id = ? AND organization_id = ?`
  );

  let totalChanges = 0;

  db.serialize(() => {
    for (const cat of order) {
      stmt.run(cat.sort_order, cat.id, orgId, function (err) {
        if (err) console.error("Update error:", err);
        else console.log(`Updated category ${cat.id} → ${cat.sort_order}, changes=${this.changes}`);
        totalChanges += this.changes;
      });
    }

    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, updated: totalChanges });
    });
  });
};
