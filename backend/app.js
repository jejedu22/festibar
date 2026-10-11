const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const routes = require('./routes');
const withOrganization = require('./middlewares/withOrganization');
const seo = require('./utils/seo');

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

// Compression gzip des réponses (JSON, JS, CSS) : gros gain sur réseau mobile / Wi-Fi d'événement
app.use(compression({ threshold: 1024 }));

app.use(express.json({ limit: '100kb' }));

// Les réponses API sont dynamiques : jamais de cache navigateur / proxy
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow'); // l'API n'a rien à faire dans un moteur de recherche
  next();
});

// Routes API
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));

// --- Référencement ---
// robots.txt et sitemap.xml sont générés (adresse absolue du site) ; sans cela, la SPA renverrait sa page
// HTML à la place, ce qui trompe les robots.
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(seo.robotsTxt(seo.siteOrigin(req)));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(seo.sitemapXml(seo.siteOrigin(req)));
});
// /index.html est un doublon de l'accueil
app.get('/index.html', (req, res) => res.redirect(301, '/'));

// Servir les fichiers statiques du frontend compilé (index: false : l'accueil passe par le fallback ci-dessous,
// qui complète le <head> pour les moteurs de recherche)
app.use(express.static(seo.PUBLIC_DIR, {
  index: false,
  maxAge: '1h',
  setHeaders(res, filePath) {
    // Fichiers Vite empreints (nom contenant le hash) : cache longue durée
    if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Le service worker ne doit pas être mis en cache par le navigateur
    if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

// Fallback SPA : toutes les routes non-API renvoient la page de l'application, avec le <head> adapté :
// pages publiques indexables, pages privées en noindex, adresses inconnues en vrai 404.
app.get(/^\/(?!api).*/, async (req, res, next) => {
  try {
    const cls = await seo.classify(req.path, withOrganization.exists);
    if (cls.kind === 'public' && req.path !== cls.canonicalPath) return res.redirect(301, cls.canonicalPath);

    res.setHeader('Cache-Control', 'no-cache');
    if (cls.kind !== 'public') res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.status(cls.kind === 'notfound' ? 404 : 200).type('html').send(seo.renderPage(cls, seo.siteOrigin(req)));
  } catch (err) {
    next(err);
  }
});

// Gestionnaire d'erreurs : JSON invalide, corps trop gros, erreurs imprévues
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête invalide' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Requête trop volumineuse' });
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur, veuillez réessayer.' });
});

module.exports = app;
