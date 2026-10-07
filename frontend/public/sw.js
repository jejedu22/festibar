// Service worker Festibar : l'application reste utilisable sans réseau ou avec un réseau saturé.
// - le shell (index.html, JS, CSS, icônes) est pré-chargé à l'installation : démarrage possible hors-ligne
// - pages : réseau d'abord, mais bascule sur la copie locale si le serveur met plus de NAV_TIMEOUT à répondre
// - fichiers /assets (noms versionnés) et icônes : cache d'abord
// - API publique en lecture (carte : produits, catégories, nom de l'organisation, manifeste de l'application) : réseau d'abord avec
//   bascule rapide sur la dernière copie. Les routes authentifiées (commandes, ventes) ne sont JAMAIS
//   mises en cache : elles sont gérées par l'application (file d'attente hors-ligne).
// Les deux lignes ci-dessous sont remplacées à la compilation (vite.config.js).
const BUILD = 'dev';
const PRECACHE = ['/', '/index.html', '/icon.svg'];

const CACHE = `festibar-${BUILD}`;
const NAV_TIMEOUT = 3000;
const API_TIMEOUT = 4000;
const PUBLIC_API = [/^\/api\/organizations\/[^/]+(\/manifest\.webmanifest)?$/, /^\/api\/[^/]+\/(products|categories)$/];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Le shell est obligatoire ; le reste est tenté au mieux (un fichier manquant ne bloque pas l'installation)
      await cache.addAll(['/', '/index.html']);
      await Promise.allSettled(PRECACHE.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('festibar-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord ; si le réseau échoue ou dépasse `timeout` et qu'une copie existe, on la sert.
// La requête continue en arrière-plan et met la copie à jour.
function networkFirst(event, request, cacheKey, timeout) {
  const net = fetch(request).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(cache => cache.put(cacheKey, copy));
    }
    return res;
  });
  event.waitUntil(net.catch(() => {}));

  const cached = () => caches.match(cacheKey);
  const fromNet = net.catch(async err => {
    const hit = await cached();
    if (hit) return hit;
    throw err;
  });
  const fromTimer = new Promise(resolve => {
    setTimeout(async () => {
      const hit = await cached();
      if (hit) resolve(hit);
    }, timeout);
  });
  return Promise.race([fromNet, fromTimer]);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, request, '/index.html', NAV_TIMEOUT));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    if (PUBLIC_API.some(re => re.test(url.pathname)) && !request.headers.has('Authorization')) {
      event.respondWith(networkFirst(event, request, request.url, API_TIMEOUT));
    }
    return;
  }

  // Fichiers statiques : cache d'abord (les noms de /assets contiennent un hash de contenu)
  event.respondWith(
    caches.match(request).then(
      cached =>
        cached ||
        fetch(request).then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return res;
        })
    )
  );
});
