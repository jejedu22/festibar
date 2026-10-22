// backend/middlewares/orgAuth.js
const jwt = require('jsonwebtoken');
const { jwtSecret, credentialVersion } = require('../config/auth');

// Rôles d'une organisation :
//  - staff   : serveurs (prise de commande)
//  - manager : gestionnaire (produits, catégories, ventes, exports)
// À utiliser après withOrganization (req.organizationId provient du slug de l'URL).
module.exports = (...roles) => (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Connexion requise' });
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Session invalide ou expirée, reconnectez-vous' });
  }

  // Le jeton doit appartenir à l'organisation de l'URL
  if (payload.orgId !== req.organizationId || !['staff', 'manager'].includes(payload.role)) {
    return res.status(401).json({ error: 'Session invalide pour cette organisation' });
  }
  // Le mot de passe du rôle a-t-il changé depuis l'ouverture de la session ? (jetons d'avant cette
  // vérification, sans `cv` : acceptés jusqu'à leur expiration, 24 h au plus)
  if (payload.cv && payload.cv !== credentialVersion(req.organizationCreds?.[payload.role])) {
    return res.status(401).json({ error: 'Mot de passe modifié, reconnectez-vous' });
  }
  if (roles.length && !roles.includes(payload.role)) {
    return res.status(403).json({ error: 'Accès réservé au gestionnaire' });
  }

  req.auth = { role: payload.role, orgId: payload.orgId };
  next();
};
