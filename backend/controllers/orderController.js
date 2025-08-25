// backend/controllers/orderController.js
const db = require('../config/database');

exports.create = (req, res) => {
  const orgId = req.organizationId;
  const { items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Empty order' });

  let total = 0;
  const orderItems = [];

  db.serialize(() => {
    const stmt = db.prepare('SELECT id, price FROM products WHERE id = ? AND organization_id = ?');
    let count = 0;

    items.forEach(item => {
      stmt.get([item.productId, orgId], (err, product) => {
        if (err) console.error(err);

        if (product) {
          total += product.price * item.quantity;
          orderItems.push({ productId: item.productId, quantity: item.quantity, price: product.price });
        }
        count++;

        if (count === items.length) {
          stmt.finalize(() => {
            db.run(
              `INSERT INTO orders (organization_id, total) VALUES (?, ?)`,
              [orgId, total],
              function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                const orderId = this.lastID;
                const itemStmt = db.prepare(
                  `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`
                );

                let inserted = 0;
                orderItems.forEach(item => {
                  itemStmt.run(orderId, item.productId, item.quantity, item.price, (err3) => {
                    if (err3) console.error(err3);
                    inserted++;

                    // Quand toutes les lignes sont insérées → on répond
                    if (inserted === orderItems.length) {
                      itemStmt.finalize();
                      res.json({ orderId, total });
                    }
                  });
                });

                // Cas particulier : si aucun produit valide
                if (orderItems.length === 0) {
                  res.json({ orderId, total });
                }
              }
            );
          });
        }
      });
    });
  });
};

exports.getOne = (req, res) => {
  const orgId = req.organizationId;
  const orderId = req.params.id;

  const query = `
    SELECT p.name, oi.price, oi.quantity
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ? AND o.organization_id = ?
  `;
  db.all(query, [orderId, orgId], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ items, total });
  });
};

exports.remove = (req, res) => {
  const orgId = req.organizationId;
  const orderId = req.params.id;

  db.serialize(() => {
    db.run(
      `DELETE FROM order_items WHERE order_id = ?`,
      [orderId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          `DELETE FROM orders WHERE id = ? AND organization_id = ?`,
          [orderId, orgId],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'Commande annulée avec succès.' });
          }
        );
      }
    );
  });
};

exports.clearAll = (req, res) => {
  const orgId = req.organizationId;

  db.serialize(() => {
    db.run(
      `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE organization_id = ?)`,
      [orgId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run(`DELETE FROM orders WHERE organization_id = ?`, [orgId], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: 'Toutes les commandes ont été supprimées pour cette organisation.' });
        });
      }
    );
  });
};

// Récupérer toutes les commandes d’une orga, groupées par jour
exports.getAll = (req, res) => {
  const orgId = req.organizationId;

  const query = `
    SELECT o.id as orderId, o.timestamp, o.total,
           p.id as productId, p.name as productName, oi.quantity, oi.price
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.organization_id = ?
    ORDER BY o.timestamp DESC
  `;

  db.all(query, [orgId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Regrouper par jour puis par commande
    const result = {};
    rows.forEach(r => {
      const day = r.timestamp.split(' ')[0]; // YYYY-MM-DD
      if (!result[day]) result[day] = {};

      if (!result[day][r.orderId]) {
        result[day][r.orderId] = {
          orderId: r.orderId,
          timestamp: r.timestamp,
          total: r.total,
          items: []
        };
      }

      result[day][r.orderId].items.push({
        productId: r.productId,
        productName: r.productName,
        quantity: r.quantity,
        price: r.price
      });
    });

    res.json(result);
  });
};

// Supprimer une ligne d’une commande et renvoyer le total mis à jour
exports.removeItem = (req, res) => {
  const orgId = req.organizationId;
  const { orderId, productId } = req.params;

  db.serialize(() => {
    // Supprimer la ligne
    db.run(
      `DELETE FROM order_items 
       WHERE order_id = ? 
         AND product_id = ? 
         AND order_id IN (SELECT id FROM orders WHERE organization_id = ?)`,
      [orderId, productId, orgId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Recalculer le total
        db.get(
          `SELECT SUM(price * quantity) as total FROM order_items WHERE order_id = ?`,
          [orderId],
          (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const newTotal = row.total || 0;

            // Mettre à jour la table orders
            db.run(
              `UPDATE orders SET total = ? WHERE id = ? AND organization_id = ?`,
              [newTotal, orderId, orgId],
              function (err3) {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json({ deleted: this.changes, total: newTotal });
              }
            );
          }
        );
      }
    );
  });
};
