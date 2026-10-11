// backend/utils/seo.js
// Référencement. L'application est une SPA : sans traitement serveur, toutes les adresses renvoient la
// même page (même titre, même description, code 200 même pour une adresse inexistante).
//
//  - pages publiques (accueil, pages légales) : titre, description, adresse canonique, Open Graph,
//    données structurées et contenu de repli pour les robots qui n'exécutent pas JavaScript ;
//  - pages privées (prise de commande et gestion des structures, administration) : jamais indexées ;
//  - adresses inconnues : vrai code 404 (la SPA affiche quand même sa page « introuvable »).
const fs = require('fs');
const path = require('path');

const SITE_NAME = 'Festibar';
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public');
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ⚠️ Titres et descriptions à garder alignés avec frontend/src/router.js (un test le vérifie).
// `title` est le titre complet du document ; `h1`, `intro`, `points`, `forWho` et `steps` alimentent le contenu
// de repli (et sont repris à l'identique dans frontend/src/pages/HomePage.vue).
const PUBLIC_PAGES = {
  '/': {
    title: 'Festibar : prise de commande pour buvettes de festivals',
    description:
      'Prise de commande pour buvettes de festivals et événements associatifs : sur téléphone, même sans réseau, avec rendu de monnaie et export des ventes.',
    h1: 'Festibar : prise de commande pour buvettes de festivals et d’événements associatifs',
    intro:
      'Fini les additions à la main : vos bénévoles saisissent les commandes sur leur téléphone, même quand le réseau sature, et le gestionnaire suit les ventes de la soirée avant d’exporter tout dans un fichier Excel.',
    points: [
      'Une commande prise en quelques appuis, même quand la file s’allonge',
      'Rendu de monnaie calculé pour vous, paiement en espèces ou par carte',
      'Continue de fonctionner sans réseau : les commandes partent dès que la connexion revient',
      'Un accès pour les serveurs, un autre pour le gestionnaire',
      'Ventes de chaque soirée, export Excel et historique des annulations',
    ],
    forWho: [
      'Associations et comités des fêtes qui tiennent une buvette',
      'Festivals, fêtes de village, tournois et autres événements',
    ],
    steps: [
      'Demandez un accès pour votre structure avec le formulaire de contact.',
      'Le gestionnaire prépare la carte : catégories, produits et prix.',
      'Les bénévoles prennent les commandes sur leur téléphone ; le gestionnaire suit les ventes et exporte les données en Excel.',
    ],
  },
  '/mentions-legales': {
    title: 'Mentions légales · Festibar',
    description:
      'Mentions légales de Festibar : éditeur, hébergeur et nature du service, un outil d’aide à la prise de commande qui n’est pas un logiciel de caisse certifié.',
    h1: 'Mentions légales',
  },
  '/confidentialite': {
    title: 'Confidentialité · Festibar',
    description:
      'Politique de confidentialité de Festibar : données traitées, durée de conservation, stockage dans le navigateur et exercice de vos droits (RGPD).',
    h1: 'Politique de confidentialité',
  },
  '/cgu': {
    title: 'Conditions d’utilisation · Festibar',
    description:
      'Conditions générales d’utilisation de Festibar : accès au service, obligations des organisations, disponibilité des données et responsabilité.',
    h1: 'Conditions générales d’utilisation',
  },
};

// Pages privées exactes de l'application (le reste dépend de l'identifiant d'une structure)
const PRIVATE_PATHS = new Set(['/admin/auth/login', '/admin/organizations']);

const esc = value =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Origine du site : PUBLIC_URL si définie ; sinon celle de la requête, limitée aux caractères d'un nom
// d'hôte pour qu'un en-tête Host forgé ne puisse rien injecter dans les pages.
function siteOrigin(req) {
  const configured = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(configured)) return configured;
  const host = req.get('host') || '';
  const safeHost = /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) ? host : 'localhost';
  return `${req.protocol}://${safeHost}`;
}

// ---------- robots.txt et sitemap.xml ----------
function robotsTxt(origin) {
  return [
    'User-agent: *',
    'Allow: /',
    // /api/ n'est volontairement pas bloqué : les pages légales s'y alimentent, et un robot qui
    // affiche la page doit pouvoir l'appeler. Les réponses de l'API portent un en-tête noindex.
    'Disallow: /admin/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

function sitemapXml(origin) {
  const urls = Object.keys(PUBLIC_PAGES)
    .map(p => `  <url>\n    <loc>${esc(origin + (p === '/' ? '/' : p))}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// ---------- Classement d'une adresse ----------
// → { kind: 'public' | 'private' | 'notfound', page?, canonicalPath? }
async function classify(pathname, organizationExists) {
  let clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const lower = clean.toLowerCase();

  if (PUBLIC_PAGES[lower]) return { kind: 'public', page: PUBLIC_PAGES[lower], canonicalPath: lower };
  if (PRIVATE_PATHS.has(clean)) return { kind: 'private' };

  const slug = clean.split('/')[1];
  if (slug && slug.length <= 60 && SLUG_RE.test(slug) && (await organizationExists(slug))) return { kind: 'private' };
  return { kind: 'notfound' };
}

// ---------- Génération du HTML ----------
let template = null;
const rendered = new Map();

function loadTemplate() {
  if (!template) template = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  return template;
}

function jsonLd(origin, page) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: SITE_NAME, inLanguage: 'fr-FR' },
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        url: `${origin}/`,
        description: page.description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        inLanguage: 'fr-FR',
        image: `${origin}/og-image.png`,
      },
    ],
  };
  // « < » échappé : impossible de refermer la balise <script> depuis les données
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function publicHead(page, origin, canonicalPath) {
  const url = origin + (canonicalPath === '/' ? '/' : canonicalPath);
  const image = `${origin}/og-image.png`;
  const tags = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Festibar, la prise de commande pour les buvettes de festivals" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ];
  if (canonicalPath === '/') tags.push(`<script type="application/ld+json">${jsonLd(origin, page)}</script>`);
  return tags.join('\n    ');
}

// Contenu de repli pour les robots et partages qui n'exécutent pas JavaScript (invisible pour les visiteurs)
function fallbackContent(page, canonicalPath) {
  const parts = [`<main>`, `<h1>${esc(page.h1)}</h1>`];
  if (page.intro) parts.push(`<p>${esc(page.intro)}</p>`);
  else parts.push(`<p>${esc(page.description)}</p>`);
  const list = (tag, items) => `<${tag}>${items.map(i => `<li>${esc(i)}</li>`).join('')}</${tag}>`;
  if (page.points) parts.push(`<h2>Fonctionnalités</h2>`, list('ul', page.points));
  if (page.forWho) parts.push(`<h2>Pour qui ?</h2>`, list('ul', page.forWho));
  if (page.steps) parts.push(`<h2>Comment ça marche ?</h2>`, list('ol', page.steps));
  parts.push(`<p>Festibar nécessite JavaScript pour fonctionner.</p>`);
  const links = Object.entries(PUBLIC_PAGES)
    .filter(([p]) => p !== canonicalPath)
    .map(([p, v]) => `<a href="${p}">${esc(p === '/' ? 'Accueil' : v.h1)}</a>`);
  parts.push(`<nav>${links.join(' · ')}</nav>`, `</main>`);
  return `<noscript>${parts.join('')}</noscript>`;
}

// Page HTML finale pour une adresse classée
function renderPage(cls, origin) {
  const key = `${cls.kind}|${cls.canonicalPath || ''}|${origin}`;
  if (rendered.has(key)) return rendered.get(key);

  let html = loadTemplate();
  if (cls.kind === 'public') {
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, '')
      .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
      .replace(/<noscript>[\s\S]*?<\/noscript>/i, () => fallbackContent(cls.page, cls.canonicalPath))
      .replace('</head>', () => `    ${publicHead(cls.page, origin, cls.canonicalPath)}\n  </head>`);
  } else {
    html = html.replace('</head>', () => '    <meta name="robots" content="noindex, nofollow" />\n  </head>');
  }

  if (rendered.size >= 100) rendered.clear(); // borne la mémoire si l'hôte varie
  rendered.set(key, html);
  return html;
}

module.exports = { PUBLIC_DIR, PUBLIC_PAGES, siteOrigin, robotsTxt, sitemapXml, classify, renderPage, esc };
