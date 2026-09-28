// backend/utils/audit.js
const db = require('../config/database');

// Trace une opération sensible (annulation, suppression…) ; n'interrompt jamais la requête
function audit(organizationId, action, { orderId = null, role = null, details = null } = {}) {
  db.runAsync(
    `INSERT INTO audit_log (organization_id, action, order_id, actor_role, details) VALUES (?, ?, ?, ?, ?)`,
    [organizationId, action, orderId, role, details ? JSON.stringify(details) : null]
  ).catch(err => console.error('Audit log :', err));
}

module.exports = audit;
