const db = require('../config/database');

exports.today = (req, res) => {
  const query = `
    SELECT p.id, p.name, p.price,
           SUM(oi.quantity) AS total_quantity,
           SUM(oi.quantity * p.price) AS total_amount
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE date(o.timestamp) = date('now')
    GROUP BY p.id
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = rows.reduce((sum, r) => sum + r.total_amount, 0);
    res.json({ products: rows, total });
  });
};

exports.daily = (req, res) => {
  const query = `
    SELECT date(o.timestamp) AS day, p.id, p.name, p.price,
           SUM(oi.quantity) AS total_quantity,
           SUM(oi.quantity * p.price) AS total_amount
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    GROUP BY day, p.id
    ORDER BY day DESC, p.name
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.day]) grouped[row.day] = { day: row.day, products: [], total: 0 };
      grouped[row.day].products.push(row);
      grouped[row.day].total += row.total_amount;
    });
    res.json(Object.values(grouped).sort((a, b) => b.day.localeCompare(a.day)));
  });
};
