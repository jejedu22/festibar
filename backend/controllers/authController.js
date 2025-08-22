const db = require('../config/database');
const bcrypt = require('bcrypt');

exports.login = (req, res) => {
  const slug = req.params.orgSlug; // depuis l'URL
  const { password } = req.body;    // depuis le fetch

  const query = `SELECT id, name, password FROM organizations WHERE slug = ?`;
  db.get(query, [slug], (err, org) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!org) return res.status(404).json({ error: 'Organisation non trouvée' });

    const valid = bcrypt.compareSync(password, org.password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect' });

    res.json({ id: org.id, name: org.name });
  });
};
