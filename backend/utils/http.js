// backend/utils/http.js

// Erreur serveur : détail dans les logs, message générique au client
function serverError(res, err) {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'Erreur serveur, veuillez réessayer.' });
}

// Limiteur de tentatives en mémoire (par clé, généralement l'IP)
function createLimiter({ max, windowMs }) {
  const hits = new Map(); // key -> { count, firstAt }

  function entry(key) {
    const e = hits.get(key);
    if (e && Date.now() - e.firstAt > windowMs) {
      hits.delete(key);
      return null;
    }
    return e;
  }

  // Nettoyage périodique pour ne pas grossir indéfiniment
  setInterval(() => {
    for (const [key, e] of hits) if (Date.now() - e.firstAt > windowMs) hits.delete(key);
  }, windowMs).unref();

  return {
    isBlocked: key => (entry(key)?.count || 0) >= max,
    hit(key) {
      const e = entry(key);
      if (e) e.count++;
      else hits.set(key, { count: 1, firstAt: Date.now() });
    },
    reset: key => hits.delete(key),
    minutes: Math.ceil(windowMs / 60000),
  };
}

module.exports = { serverError, createLimiter };
