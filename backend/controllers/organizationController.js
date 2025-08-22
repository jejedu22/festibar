// controllers/organizationController.js
const db = require('../config/database');

// --- Liste des organisations ---
exports.getAll = (req, res) => {
  db.all('SELECT * FROM organizations', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// --- Nom d'une organisation ---
exports.getOne = (req, res) => {
    const orgId = req.organizationId;
    const query = `
      SELECT o.name, o.password
      FROM organizations o
      WHERE o.id = ?
    `;
  db.get(query, [orgId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// --- Créer une organisation ---
const bcrypt = require('bcrypt');

exports.create = (req, res) => {
  const { name, slug, password } = req.body;
  if (!name || !slug || !password) return res.status(400).json({ error: 'Tous les champs sont requis' });

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO organizations (name, slug, password) VALUES (?, ?, ?)',
    [name, slug, hashedPassword],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, slug });
    }
  );
};


// --- Supprimer une organisation ---
exports.delete = (req, res) => {
  const { id } = req.params;

  // Optionnel : vérifier si des produits/commandes existent pour cette organisation
  db.get(
    'SELECT COUNT(*) AS count FROM products WHERE organization_id = ?',
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row.count > 0) return res.status(400).json({ error: 'Organisation utilisée par des produits' });

      db.run('DELETE FROM organizations WHERE id = ?', [id], function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ deleted: this.changes });
      });
    }
  );
};
