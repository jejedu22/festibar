const db = require('../config/database');

exports.getAll = (req, res) => {
  const query = `
    SELECT p.id, p.name, p.price, p.category_id, p.available, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY c.name, p.name
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.create = (req, res) => {
  const { name, price, category_id, available } = req.body;
  db.run(
    `INSERT INTO products (name, price, category_id, available) VALUES (?, ?, ?, ?)`,
    [name, price, category_id || null, available ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, price, category_id, available });
    }
  );
};

exports.update = (req, res) => {
  const { name, price, category_id, available } = req.body;
  db.run(
    `UPDATE products SET name = ?, price = ?, category_id = ?, available = ? WHERE id = ?`,
    [name, price, category_id || null, available ? 1 : 0, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
};

exports.remove = (req, res) => {
  db.run(`DELETE FROM products WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
};
