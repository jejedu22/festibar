// Gabarit identique à la sortie de Vite, dans un dossier temporaire : le test ne dépend pas du build du frontend
const fs = require('fs');
const os = require('os');
const path = require('path');
const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'festibar-public-'));
fs.writeFileSync(path.join(publicDir, 'index.html'), `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Description par défaut" />
    <title>Festibar</title>
    <script type="module" crossorigin src="/assets/index-abc123.js"></script>
  </head>
  <body>
    <noscript>Festibar nécessite JavaScript.</noscript>
    <div id="app"></div>
  </body>
</html>
`);
process.env.PUBLIC_DIR = publicDir;
process.env.PUBLIC_URL = 'https://bar.exemple.fr';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');
const { PUBLIC_PAGES, siteOrigin } = require('../utils/seo');

let t;
let site;

before(async () => {
  t = await start();
  site = t.base.replace(/\/api$/, '');
  await t.createOrg('bar');
});
after(async () => {
  await t.stop();
  fs.rmSync(publicDir, { recursive: true, force: true });
});

const get = async (url, options = {}) => {
  const res = await fetch(site + url, { redirect: 'manual', ...options });
  return { res, status: res.status, body: await res.text() };
};
const count = (html, re) => (html.match(re) || []).length;
const metaContent = (html, selector) => (html.match(new RegExp(`<meta ${selector} content="([^"]*)"`)) || [])[1];

test('robots.txt : texte brut, adresse du plan du site, administration exclue, API non bloquée', async () => {
  const { res, status, body } = await get('/robots.txt');
  assert.equal(status, 200);
  assert.match(res.headers.get('content-type'), /^text\/plain/);
  assert.match(body, /^User-agent: \*$/m);
  assert.match(body, /^Disallow: \/admin\/$/m);
  assert.match(body, /^Sitemap: https:\/\/bar\.exemple\.fr\/sitemap\.xml$/m);
  assert.doesNotMatch(body, /Disallow: \/api/); // les pages légales s'y alimentent
});

test('sitemap.xml : XML valide avec les seules pages publiques, en adresses absolues', async () => {
  const { res, status, body } = await get('/sitemap.xml');
  assert.equal(status, 200);
  assert.match(res.headers.get('content-type'), /^application\/xml/);
  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(urls, [
    'https://bar.exemple.fr/', 'https://bar.exemple.fr/mentions-legales',
    'https://bar.exemple.fr/confidentialite', 'https://bar.exemple.fr/cgu',
  ]);
  assert.ok(body.startsWith('<?xml'));
  assert.ok(!body.includes('/admin') && !body.includes('exemple.fr/bar')); // ni administration, ni pages de structures
});

test('accueil : <head> complet, sans doublon, données structurées valides, contenu de repli', async () => {
  const { status, body } = await get('/');
  assert.equal(status, 200);
  const page = PUBLIC_PAGES['/'];
  assert.equal(count(body, /<title>/g), 1);
  assert.match(body, new RegExp(`<title>${page.title}</title>`));
  assert.equal(count(body, /name="description"/g), 1);
  assert.equal(metaContent(body, 'name="description"'), page.description);
  assert.doesNotMatch(body, /Description par défaut/);
  assert.match(body, /<link rel="canonical" href="https:\/\/bar\.exemple\.fr\/" \/>/);
  assert.match(body, /<meta name="robots" content="index, follow, max-image-preview:large" \/>/);
  assert.equal(metaContent(body, 'property="og:url"'), 'https://bar.exemple.fr/');
  assert.equal(metaContent(body, 'property="og:image"'), 'https://bar.exemple.fr/og-image.png');
  assert.equal(metaContent(body, 'property="og:locale"'), 'fr_FR');
  assert.equal(metaContent(body, 'name="twitter:card"'), 'summary_large_image');

  const ld = JSON.parse(body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(ld['@graph'].map(n => n['@type']), ['WebSite', 'SoftwareApplication']);
  assert.equal(ld['@graph'][1].url, 'https://bar.exemple.fr/');

  // Les robots sans JavaScript lisent le <noscript> : titre, fonctionnalités, public visé, étapes
  const noscript = body.match(/<noscript>([\s\S]*?)<\/noscript>/)[1];
  assert.match(noscript, /<h1>[^<]*prise de commande pour buvettes[^<]*<\/h1>/);
  for (const item of [...page.points, ...page.forWho, ...page.steps]) assert.ok(noscript.includes(item), item);
  assert.match(noscript, /<a href="\/mentions-legales">/);
  assert.ok(body.includes('<div id="app"></div>')); // la SPA se monte normalement
});

test('pages légales : chacune a son titre, sa description et son adresse canonique', async () => {
  for (const [route, page] of Object.entries(PUBLIC_PAGES).filter(([r]) => r !== '/')) {
    const { status, body } = await get(route);
    assert.equal(status, 200, route);
    assert.match(body, new RegExp(`<title>${page.title}</title>`), route);
    assert.equal(metaContent(body, 'name="description"'), page.description, route);
    assert.ok(body.includes(`<link rel="canonical" href="https://bar.exemple.fr${route}" />`), route);
    assert.ok(!body.includes('ld+json'), route); // données structurées : accueil uniquement
    assert.ok(body.includes(`<h1>${page.h1}</h1>`), route);
  }
});

test('longueurs adaptées aux résultats de recherche : titre ≤ 60, description ≤ 160', () => {
  for (const [route, page] of Object.entries(PUBLIC_PAGES)) {
    assert.ok(page.title.length <= 60, `${route} : titre de ${page.title.length} caractères`);
    assert.ok(page.description.length >= 70 && page.description.length <= 160, `${route} : description de ${page.description.length} caractères`);
  }
});

test('pages privées : jamais indexées (balise et en-tête), sans adresse canonique', async () => {
  for (const route of ['/bar', '/bar/', '/bar/login', '/bar/admin', '/bar/summary/daily', '/admin/organizations', '/admin/auth/login']) {
    const { res, status, body } = await get(route);
    assert.equal(status, 200, route);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow', route);
    assert.match(body, /<meta name="robots" content="noindex, nofollow" \/>/, route);
    assert.ok(!body.includes('rel="canonical"') && !body.includes('og:title'), route);
    assert.match(body, /<div id="app"><\/div>/, route);
  }
});

test('adresses inconnues : vrai 404 (la SPA affiche sa page), noindex', async () => {
  for (const route of ['/page-inexistante', '/admin/zzz', '/robots.txt.bak', '/inconnu/login', '/BAR']) {
    const { res, status, body } = await get(route);
    assert.equal(status, 404, route);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow', route);
    assert.match(body, /<div id="app"><\/div>/, route);
  }
});

test('adresses en double : redirection permanente vers l’adresse canonique', async () => {
  for (const [from, to] of [['/CGU', '/cgu'], ['/cgu/', '/cgu'], ['/Mentions-Legales/', '/mentions-legales'], ['/index.html', '/']]) {
    const { res, status } = await get(from);
    assert.equal(status, 301, from);
    assert.equal(res.headers.get('location'), to, from);
  }
});

test('API : jamais indexée', async () => {
  const r = await t.call('GET', '/legal');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('origine du site : PUBLIC_URL prioritaire, sinon l’hôte de la requête, jamais de contenu injecté', () => {
  const req = host => ({ protocol: 'https', get: () => host });
  assert.equal(siteOrigin(req('whatever')), 'https://bar.exemple.fr');

  const saved = process.env.PUBLIC_URL;
  try {
    delete process.env.PUBLIC_URL;
    assert.equal(siteOrigin(req('bar.exemple.fr:8443')), 'https://bar.exemple.fr:8443');
    assert.equal(siteOrigin(req('evil.com"><script>alert(1)</script>')), 'https://localhost');
    assert.equal(siteOrigin(req(undefined)), 'https://localhost');
    process.env.PUBLIC_URL = 'https://x.fr"><script>';
    assert.equal(siteOrigin(req('ok.fr')), 'https://ok.fr'); // PUBLIC_URL invalide ignorée
    process.env.PUBLIC_URL = 'https://bar.exemple.fr/';
    assert.equal(siteOrigin(req('ok.fr')), 'https://bar.exemple.fr'); // barre finale retirée
  } finally {
    process.env.PUBLIC_URL = saved;
  }
});

test('cohérence : les titres et textes du serveur sont ceux du frontend', () => {
  const router = fs.readFileSync(path.join(__dirname, '../../frontend/src/router.js'), 'utf8');
  const home = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/HomePage.vue'), 'utf8');
  for (const [route, page] of Object.entries(PUBLIC_PAGES)) {
    assert.ok(router.includes(page.description), `${route} : description absente du routeur`);
    const shortTitle = route === '/' ? page.title : page.title.replace(' · Festibar', '');
    assert.ok(router.includes(shortTitle), `${route} : titre absent du routeur`);
  }
  for (const item of [...PUBLIC_PAGES['/'].points, ...PUBLIC_PAGES['/'].forWho, ...PUBLIC_PAGES['/'].steps]) {
    assert.ok(home.includes(item), `accueil : « ${item} » absent de HomePage.vue`);
  }
});
