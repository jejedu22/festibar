// ======================
// ===== BACKEND ========
// ======================

// backend/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// --- Database setup ---
const db = new sqlite3.Database('./bar.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  // Vérification colonne category_id dans products avant ajout
  db.all(`PRAGMA table_info(products)`, (err, columns) => {
    if (err) {
      console.error('Erreur récupération colonnes produits:', err);
      return;
    }

    const categoryColumnExists = columns.some(col => col.name === 'category_id');
    if (!categoryColumnExists) {
      db.run(`ALTER TABLE products ADD COLUMN category_id INTEGER`, (err) => {
        if (err) console.error('Erreur ajout colonne category_id:', err);
        else console.log('Colonne category_id ajoutée avec succès.');
      });
    } else {
      console.log('Colonne category_id déjà présente, pas d\'ajout.');
    }
  });
});


// --- Routes ---

app.get('/api/products', (req, res) => {
  const query = `
    SELECT p.id, p.name, p.price, p.category_id, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY c.name, p.name
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


app.post('/api/products', (req, res) => {
  const { name, price, category_id } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price required' });
  }
  db.run('INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)', [name, price, category_id || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, price, category_id });
  });
});


app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.put('/api/products/:id', (req, res) => {
  const { name, price } = req.body;
  db.run('UPDATE products SET name = ?, price = ? WHERE id = ?', [name, price, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// GET /categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /categories
app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  db.run('INSERT INTO categories (name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  const categoryId = req.params.id;
  
  db.get('SELECT COUNT(*) AS count FROM products WHERE category_id = ?', [categoryId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row.count > 0) {
      return res.status(400).json({ error: "Impossible de supprimer une catégorie utilisée par des produits." });
    }
    
    db.run('DELETE FROM categories WHERE id = ?', [categoryId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  });
});

app.post('/api/orders', (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Empty order' });

  let total = 0;

  db.serialize(() => {
    const stmt = db.prepare('SELECT id, price FROM products WHERE id = ?');
    const orderItems = [];

    let count = 0;
    items.forEach((item, index) => {
      stmt.get(item.productId, (err, product) => {
        if (product) {
          total += product.price * item.quantity;
          orderItems.push(item);
        }
        count++;
        if (count === items.length) {
          stmt.finalize(() => {
            db.run('INSERT INTO orders (total) VALUES (?)', [total], function (err) {
              if (err) return res.status(500).json({ error: err.message });
              const orderId = this.lastID;

              const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)');
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
});

// GET /orders/:id - détail d'une commande
app.get('/api/orders/:id', (req, res) => {
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
});

app.get('/api/summary/today', (req, res) => {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.price,
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
});

app.get('/api/summary/daily', (req, res) => {
  const query = `
    SELECT 
      date(o.timestamp) AS day,
      p.id,
      p.name,
      p.price,
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

    // On va regrouper par jour dans un objet
    const grouped = {};

    rows.forEach(row => {
      if (!grouped[row.day]) {
        grouped[row.day] = {
          day: row.day,
          products: [],
          total: 0
        };
      }
      grouped[row.day].products.push({
        id: row.id,
        name: row.name,
        price: row.price,
        total_quantity: row.total_quantity,
        total_amount: row.total_amount
      });
      grouped[row.day].total += row.total_amount;
    });

    // Convertir en tableau trié par jour décroissant
    const result = Object.values(grouped).sort((a, b) => b.day.localeCompare(a.day));

    res.json(result);
  });
});

app.delete('/api/orders', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM order_items', (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run('DELETE FROM orders', (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: 'Toutes les commandes ont été supprimées.' });
      });
    });
  });
});

// Servir le frontend compilé
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});