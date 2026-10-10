// backend/utils/password.js
// Vérification des mots de passe (bcrypt), conçue pour absorber une ouverture où des dizaines
// d'appareils se connectent en même temps avec les mêmes mots de passe.
//
// bcrypt est volontairement coûteux (~65 ms de CPU) : sans précaution, 220 connexions simultanées
// occupent tous les threads de libuv pendant près d'une minute et gèlent aussi les requêtes SQL
// (qui partagent ces threads), donc toute l'application. Trois protections :
//   1. un résultat de vérification est mémorisé : les 10 serveurs d'une structure partagent le même
//      mot de passe, seule la première connexion paie le calcul ;
//   2. des vérifications identiques simultanées partagent un seul calcul ;
//   3. au plus BCRYPT_CONCURRENCY calculs bcrypt en parallèle, pour laisser des threads libres au
//      reste de l'application ; au-delà de 200 calculs en attente, la demande est refusée (GATE_FULL).
//
// Sécurité : la mémoire ne contient jamais le mot de passe, seulement une empreinte HMAC calculée avec
// une clé aléatoire propre au processus. La clé de mémorisation inclut l'empreinte bcrypt stockée :
// changer un mot de passe change l'empreinte, donc l'ancien résultat n'est plus jamais réutilisé.
// Les échecs sont mémorisés comme les réussites, mais la limitation des tentatives par IP reste
// appliquée à chaque requête par les appelants.
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { createGate } = require('./concurrency');

const CONCURRENCY = Number.parseInt(process.env.BCRYPT_CONCURRENCY || '2', 10) || 2;
const MAX_WAITING = 200;
const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 5000;

const gate = createGate({ concurrency: CONCURRENCY, maxQueue: MAX_WAITING });
const secret = crypto.randomBytes(32);
const results = new Map(); // empreinte HMAC -> { ok, expires }
const pending = new Map(); // empreinte HMAC -> promesse du calcul en cours

const digest = (hash, password) =>
  crypto.createHmac('sha256', secret).update(hash).update('\0').update(password).digest('hex');

function remember(key, ok) {
  if (results.size >= MAX_ENTRIES) results.delete(results.keys().next().value); // la plus ancienne
  results.set(key, { ok, expires: Date.now() + TTL_MS });
}

// Vrai si `password` correspond à l'empreinte bcrypt `hash`.
// Lève une erreur de code GATE_FULL quand le serveur est saturé de vérifications.
async function verifyPassword(password, hash) {
  if (!hash || typeof password !== 'string') return false;
  const key = digest(hash, password);

  const hit = results.get(key);
  if (hit) {
    if (hit.expires > Date.now()) return hit.ok;
    results.delete(key);
  }

  let job = pending.get(key);
  if (!job) {
    job = gate
      .run(() => bcrypt.compare(password, hash))
      .then(ok => { remember(key, ok); return ok; })
      .finally(() => pending.delete(key));
    pending.set(key, job);
  }
  return job;
}

// Réponse HTTP commune quand le serveur est saturé
function sendBusy(res) {
  res.set('Retry-After', '5');
  return res.status(503).json({ error: 'Serveur très sollicité, réessayez dans quelques secondes.' });
}

module.exports = { verifyPassword, sendBusy };
