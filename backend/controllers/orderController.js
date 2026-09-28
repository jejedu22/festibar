// backend/controllers/orderController.js
const db = require('../config/database');
const audit = require('../utils/audit');
const { serverError } = require('../utils/http');
const { serviceDay, toLocalString, parseUtc } = require('../utils/time');
const { STAFF_CANCEL_MINUTES } = require('../config/auth');

const PAYMENT_METHODS = ['cash', 'card', 'other'];
const MAX_LINES = 50;
const MAX_QUANTITY = 99;

const round2 = n => Math.round(n * 100) / 100;

async function loadOrder(orgId, orderId) {
  const order = await db.getAsync(
    `SELECT id, total, timestamp, status, payment_method, cancelled_at, cancelled_by
     FROM orders WHERE id = ? AND organization_id = ?`,
    [orderId, orgId]
  );
  if (!order) return null;
  const items = await db.allAsync(
    `SELECT oi.product_id AS productId, p.name, oi.price, oi.quantity
     FROM order_items oi JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
    [orderId]
  );
  return {
    orderId: order.id,
    total: order.total,
    status: order.status,
    paymentMethod: order.payment_method,
    timestamp: toLocalString(order.timestamp),
    items,
  };
}

// --- Création d'une commande ---
exports.create = async (req, res) => {
  const orgId = req.organizationId;
  const { items, paymentMethod = 'cash', clientId } = req.body || {};

  // Validation
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La commande est vide' });
  }
  if (items.length > MAX_LINES) {
    return res.status(400).json({ error: 'Commande trop longue' });
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Moyen de paiement invalide' });
  }
  if (clientId !== undefined && (typeof clientId !== 'string' || clientId.length > 64)) {
    return res.status(400).json({ error: 'Identifiant de commande invalide' });
  }

  // Regroupe les lignes d'un même produit
  const quantities = new Map();
  for (const item of items) {
    const productId = Number(item?.productId);
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return res.status(400).json({ error: 'Quantité ou produit invalide' });
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  try {
    // Commande déjà reçue (renvoi après une coupure réseau) → on renvoie l'existante
    if (clientId) {
      const existing = await db.getAsync(
        `SELECT id FROM orders WHERE organization_id = ? AND client_id = ?`,
        [orgId, clientId]
      );
      if (existing) return res.json(await loadOrder(orgId, existing.id));
    }

    const ids = [...quantities.keys()];
    const products = await db.allAsync(
      `SELECT id, name, price, available FROM products
       WHERE organization_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
      [orgId, ...ids]
    );
    const byId = new Map(products.map(p => [p.id, p]));

    const missing = ids.filter(id => !byId.has(id));
    if (missing.length) {
      return res.status(400).json({ error: 'Un produit de la commande n’existe plus' });
    }
    const unavailable = products.filter(p => !p.available).map(p => p.name);
    if (unavailable.length) {
      return res.status(409).json({ error: `Produit épuisé : ${unavailable.join(', ')}`, unavailable });
    }

    const lines = ids.map(id => ({ productId: id, quantity: quantities.get(id), price: byId.get(id).price }));
    const total = round2(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));

    let orderId;
    try {
      ({ lastID: orderId } = await db.runAsync(
        `INSERT INTO orders (organization_id, total, payment_method, client_id) VALUES (?, ?, ?, ?)`,
        [orgId, total, paymentMethod, clientId || null]
      ));
    } catch (err) {
      // Deux envois simultanés du même clientId
      if (clientId && err.code === 'SQLITE_CONSTRAINT') {
        const existing = await db.getAsync(
          `SELECT id FROM orders WHERE organization_id = ? AND client_id = ?`,
          [orgId, clientId]
        );
        if (existing) return res.json(await loadOrder(orgId, existing.id));
      }
      throw err;
    }

    // Une seule instruction pour toutes les lignes (atomique)
    try {
      await db.runAsync(
        `INSERT INTO order_items (order_id, product_id, quantity, price, sort_order)
         VALUES ${lines.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
        lines.flatMap((l, i) => [orderId, l.productId, l.quantity, l.price, i])
      );
    } catch (err) {
      await db.runAsync(`DELETE FROM orders WHERE id = ?`, [orderId]).catch(() => {});
      throw err;
    }

    res.status(201).json(await loadOrder(orgId, orderId));
  } catch (err) {
    serverError(res, err);
  }
};

// --- Détail d'une commande ---
exports.getOne = async (req, res) => {
  try {
    const order = await loadOrder(req.organizationId, req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    serverError(res, err);
  }
};

// --- Annulation (la commande est conservée avec le statut "cancelled") ---
exports.cancel = async (req, res) => {
  const orgId = req.organizationId;
  const orderId = req.params.id;
  const { role } = req.auth;

  try {
    const order = await db.getAsync(
      `SELECT id, total, timestamp, status FROM orders WHERE id = ? AND organization_id = ?`,
      [orderId, orgId]
    );
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.status === 'cancelled') return res.status(409).json({ error: 'Commande déjà annulée' });

    if (role === 'staff') {
      const ageMinutes = (Date.now() - parseUtc(order.timestamp).getTime()) / 60000;
      if (ageMinutes > STAFF_CANCEL_MINUTES) {
        return res.status(403).json({
          error: `Annulation possible pendant ${STAFF_CANCEL_MINUTES} minutes : demandez au gestionnaire`,
        });
      }
    }

    await db.runAsync(
      `UPDATE orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?
       WHERE id = ? AND organization_id = ?`,
      [role, orderId, orgId]
    );
    audit(orgId, 'order.cancel', { orderId: order.id, role, details: { total: order.total } });
    res.json({ message: 'Commande annulée.' });
  } catch (err) {
    serverError(res, err);
  }
};

// --- Suppression définitive de toutes les commandes (remise à zéro) ---
exports.clearAll = async (req, res) => {
  const orgId = req.organizationId;
  const { confirm } = req.body || {};

  // Confirmation explicite : le slug de l'organisation doit être renvoyé
  if (confirm !== req.params.orgSlug) {
    return res.status(400).json({ error: 'Confirmation invalide' });
  }

  try {
    const stats = await db.getAsync(
      `SELECT COUNT(*) AS count, IFNULL(SUM(CASE WHEN status = 'active' THEN total END), 0) AS total
       FROM orders WHERE organization_id = ?`,
      [orgId]
    );
    await db.runAsync(
      `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE organization_id = ?)`,
      [orgId]
    );
    await db.runAsync(`DELETE FROM orders WHERE organization_id = ?`, [orgId]);
    audit(orgId, 'orders.clear_all', { role: req.auth.role, details: stats });
    res.json({ message: 'Toutes les commandes ont été supprimées.', deleted: stats.count });
  } catch (err) {
    serverError(res, err);
  }
};

// --- Toutes les commandes d'une organisation, groupées par journée de service ---
exports.getAll = async (req, res) => {
  const orgId = req.organizationId;

  try {
    const rows = await db.allAsync(
      `SELECT o.id AS orderId, o.timestamp, o.total, o.status, o.payment_method,
              p.id AS productId, p.name AS productName, oi.quantity, oi.price
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.organization_id = ?
       ORDER BY o.id DESC, oi.id`,
      [orgId]
    );

    const result = {};
    const byId = new Map();
    for (const r of rows) {
      let order = byId.get(r.orderId);
      if (!order) {
        const day = serviceDay(r.timestamp);
        order = {
          orderId: r.orderId,
          timestamp: toLocalString(r.timestamp),
          total: r.total,
          status: r.status,
          paymentMethod: r.payment_method,
          items: [],
        };
        byId.set(r.orderId, order);
        (result[day] ||= []).push(order);
      }
      order.items.push({ productId: r.productId, productName: r.productName, quantity: r.quantity, price: r.price });
    }

    res.json(result);
  } catch (err) {
    serverError(res, err);
  }
};

// --- Supprimer une ligne d'une commande (tracé) et renvoyer le total mis à jour ---
exports.removeItem = async (req, res) => {
  const orgId = req.organizationId;
  const { orderId, productId } = req.params;

  try {
    const line = await db.getAsync(
      `SELECT oi.quantity, oi.price, p.name
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ? AND oi.product_id = ? AND o.organization_id = ?`,
      [orderId, productId, orgId]
    );
    if (!line) return res.status(404).json({ error: 'Ligne introuvable' });

    await db.runAsync(`DELETE FROM order_items WHERE order_id = ? AND product_id = ?`, [orderId, productId]);
    const row = await db.getAsync(
      `SELECT SUM(price * quantity) AS total FROM order_items WHERE order_id = ?`,
      [orderId]
    );
    const newTotal = round2(row.total || 0);
    await db.runAsync(`UPDATE orders SET total = ? WHERE id = ? AND organization_id = ?`, [newTotal, orderId, orgId]);

    audit(orgId, 'order.remove_item', { orderId: Number(orderId), role: req.auth.role, details: line });
    res.json({ total: newTotal });
  } catch (err) {
    serverError(res, err);
  }
};
