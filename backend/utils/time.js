// backend/utils/time.js
// Les horodatages sont stockés en UTC ("YYYY-MM-DD HH:MM:SS", CURRENT_TIMESTAMP de SQLite).
// Ils sont regroupés par "journée de service" dans le fuseau de l'événement :
// avec SERVICE_DAY_START_HOUR=6, une vente à 1h du matin compte pour la soirée de la veille.

const TIMEZONE = process.env.APP_TIMEZONE || 'Europe/Paris';
const DAY_START_HOUR = Number.parseInt(process.env.SERVICE_DAY_START_HOUR ?? '6', 10) || 0;

function parseUtc(ts) {
  if (ts instanceof Date) return ts;
  return new Date(String(ts).replace(' ', 'T') + 'Z');
}

// Composants date/heure locaux dans le fuseau de l'événement
function localParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}

// "YYYY-MM-DD HH:MM:SS" en heure locale
function toLocalString(ts) {
  const p = localParts(parseUtc(ts));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// Journée de service "YYYY-MM-DD"
function serviceDay(ts) {
  const shifted = new Date(parseUtc(ts).getTime() - DAY_START_HOUR * 3600 * 1000);
  const p = localParts(shifted);
  return `${p.year}-${p.month}-${p.day}`;
}

module.exports = { toLocalString, serviceDay, parseUtc, TIMEZONE };
