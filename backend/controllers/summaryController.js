// backend/controllers/summaryController.js
const db = require('../config/database');
const { serverError } = require('../utils/http');
const { serviceDay } = require('../utils/time');

const round2 = n => Math.round(n * 100) / 100;

// Agrège les ventes par journée de service (commandes annulées exclues des totaux)
async function computeDailyUncached(orgId) {
  const orders = await db.allAsync(
    `SELECT id, timestamp, total, status, payment_method FROM orders WHERE organization_id = ?`,
    [orgId]
  );
  const items = await db.allAsync(
    `SELECT oi.order_id, p.id, p.name, oi.price, oi.quantity
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN products p ON oi.product_id = p.id
     WHERE o.organization_id = ? AND o.status = 'active'`,
    [orgId]
  );

  const days = new Map();
  const dayOfOrder = new Map();
  const getDay = day => {
    if (!days.has(day)) {
      days.set(day, {
        day, total: 0, orderCount: 0, cancelledCount: 0,
        byPaymentMethod: { cash: 0, card: 0, other: 0 },
        products: new Map(),
      });
    }
    return days.get(day);
  };

  for (const o of orders) {
    const d = getDay(serviceDay(o.timestamp));
    dayOfOrder.set(o.id, d);
    if (o.status === 'cancelled') {
      d.cancelledCount++;
      continue;
    }
    d.orderCount++;
    d.total += o.total;
    d.byPaymentMethod[o.payment_method] = (d.byPaymentMethod[o.payment_method] || 0) + o.total;
  }

  for (const it of items) {
    const d = dayOfOrder.get(it.order_id);
    const key = `${it.id}|${it.price}`; // un changement de prix donne une ligne distincte
    const p = d.products.get(key) || { id: it.id, name: it.name, price: it.price, total_quantity: 0, total_amount: 0 };
    p.total_quantity += it.quantity;
    p.total_amount += it.quantity * it.price;
    d.products.set(key, p);
  }

  return [...days.values()]
    .map(d => ({
      ...d,
      total: round2(d.total),
      byPaymentMethod: Object.fromEntries(Object.entries(d.byPaymentMethod).map(([k, v]) => [k, round2(v)])),
      products: [...d.products.values()]
        .map(p => ({ ...p, total_amount: round2(p.total_amount) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

// Cache par organisation : le récapitulatif relit toutes les commandes, on évite de le recalculer
// à chaque appel (plusieurs gestionnaires / écrans). Invalidé à chaque modification des ventes ;
// la durée de vie courte sert de filet de sécurité. Les calculs simultanés sont mutualisés.
const CACHE_TTL_MS = 30 * 1000;
const cache = new Map(); // orgId -> { promise, expires }

function computeDaily(orgId) {
  const hit = cache.get(orgId);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const promise = computeDailyUncached(orgId);
  const entry = { promise, expires: Date.now() + CACHE_TTL_MS };
  cache.set(orgId, entry);
  promise.catch(() => { if (cache.get(orgId) === entry) cache.delete(orgId); });
  return promise;
}

// À appeler après toute modification de commandes ou de produits (nom / prix)
function invalidate(orgId) {
  cache.delete(orgId);
}

exports.computeDaily = computeDaily;
exports.invalidate = invalidate;

exports.today = async (req, res) => {
  try {
    const today = serviceDay(new Date());
    const day = (await computeDaily(req.organizationId)).find(d => d.day === today);
    res.json(day || { day: today, total: 0, orderCount: 0, cancelledCount: 0, byPaymentMethod: {}, products: [] });
  } catch (err) {
    serverError(res, err);
  }
};

exports.daily = async (req, res) => {
  try {
    res.json(await computeDaily(req.organizationId));
  } catch (err) {
    serverError(res, err);
  }
};
