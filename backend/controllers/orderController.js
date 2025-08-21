const db = require('../config/database');

exports.create = (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Empty order' });

  let total = 0;
  db.serialize(() => {
    const stmt = db.prepare('SELECT id, price FROM products WHERE id = ?');
    const orderItems = [];
    let count = 0;

    items.forEach(item => {
      stmt.get(item.productId, (err, product) => {
        if (product) {
          total += product.price * item.quantity;
          orderItems.push(item);
        }
        count++;
        if (count === items.length) {
          stmt.finalize(() => {
            db.run(`INSERT INTO orders (total) VALUES (?)`, [total], function (err2) {
              if (err2) return res.status(500).json({ error: err2.message });

              const orderId = this.lastID;
              const itemStmt = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)`);

              orderItems.forEach(item => {
                itemStmt.run(orderId, item.productId, item.quantity);
              });
              itemStmt.finalize();

              res.json({ orderId, total });
            });
          });
        }
      });
    });
  });
};

exports.getOne = (req, res) => {
  const orderId = req.params.id;
  const query = `
    SELECT p.name, p.price, oi.quantity
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `;
  db.all(query, [orderId], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ items, total });
  });
};

exports.remove = (req, res) => {
  const orderId = req.params.id;
  db.serialize(() => {
    db.run(`DELETE FROM order_items WHERE order_id = ?`, [orderId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run(`DELETE FROM orders WHERE id = ?`, [orderId], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: 'Commande annulée avec succès.' });
      });
    });
  });
};

exports.clearAll = (req, res) => {
  db.serialize(() => {
    db.run(`DELETE FROM order_items`, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run(`DELETE FROM orders`, (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: 'Toutes les commandes ont été supprimées.' });
      });
    });
  });
};
