// backend/middlewares/userAuth.js
function userAuth(req, res, next) {
  const auth = req.headers['x-auth'] ? JSON.parse(req.headers['x-auth']) : null;
  if (!auth) return res.status(401).json({ error: 'Non autorisé' });
  req.organizationId = auth.id;
  next();
}

module.exports = userAuth;
