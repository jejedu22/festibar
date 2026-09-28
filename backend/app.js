const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');

const app = express();

// Derrière un reverse proxy (Caddy, Traefik, nginx…) : TRUST_PROXY=1 pour avoir la vraie IP client
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(v) ? Number(v) : v === 'true' ? true : v);
}

// En-têtes de sécurité
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // L'application peut être servie en HTTP sur un réseau local : pas de mise à niveau forcée
        upgradeInsecureRequests: null,
      },
    },
    // HSTS uniquement si l'application est servie en HTTPS
    strictTransportSecurity: process.env.ENABLE_HSTS === 'true',
  })
);

// CORS : désactivé par défaut (frontend servi par le même serveur) ; liste blanche via ALLOWED_ORIGINS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (allowedOrigins.length) app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: '100kb' }));

// Routes API
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));

// Servir les fichiers statiques du frontend compilé
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    // Le service worker et index.html ne doivent pas être mis en cache par le navigateur
    if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

// Fallback SPA : toutes les routes non-API renvoient vers index.html
app.get(/^\/(?!api).*/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestionnaire d'erreurs : JSON invalide, corps trop gros, erreurs imprévues
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête invalide' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Requête trop volumineuse' });
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur, veuillez réessayer.' });
});

module.exports = app;
