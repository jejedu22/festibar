const db = require('../config/database');

exports.getAll = (req, res) => {
  const orgId = req.organizationId;
  db.all(`SELECT * FROM categories WHERE organization_id = ?`, [orgId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.create = (req, res) => {
  const orgId = req.organizationId;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  db.run(
    `INSERT INTO categories (organization_id, name) VALUES (?, ?)`,
    [orgId, name],
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
