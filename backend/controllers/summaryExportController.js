// backend/controllers/summaryExportController.js
const db = require('../config/database');
const ExcelJS = require('exceljs');
const { serverError } = require('../utils/http');
const { serviceDay, toLocalString } = require('../utils/time');

const PAYMENT_LABELS = { cash: 'Espèces', card: 'Carte', other: 'Autre' };
const EURO_FORMAT = '#,##0.00 "€";[Red]-#,##0.00 "€"';

exports.exportOrders = async (req, res) => {
  const orgId = req.organizationId;

  try {
    const rows = await db.allAsync(
      `SELECT o.id AS order_id, o.timestamp, o.status, o.payment_method, o.cancelled_at,
              p.name AS product_name, oi.quantity, oi.price
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.organization_id = ?
       ORDER BY o.timestamp ASC, o.id ASC, oi.id ASC`,
      [orgId]
    );
    const auditRows = await db.allAsync(
      `SELECT created_at, action, order_id, actor_role, details FROM audit_log
       WHERE organization_id = ? ORDER BY id ASC`,
      [orgId]
    );

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet('Commandes');
    sheet.columns = [
      { header: 'Journée', key: 'day', width: 12 },
      { header: 'Date / Heure', key: 'timestamp', width: 20 },
      { header: 'N° commande', key: 'order_id', width: 12 },
      { header: 'Statut', key: 'status', width: 10 },
      { header: 'Paiement', key: 'payment', width: 10 },
      { header: 'Produit', key: 'product_name', width: 25 },
      { header: 'Quantité', key: 'quantity', width: 10 },
      { header: 'Prix unitaire', key: 'price', width: 13 },
      { header: 'Total', key: 'total', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow({
        day: serviceDay(row.timestamp),
        timestamp: toLocalString(row.timestamp),
        order_id: row.order_id,
        status: row.status === 'cancelled' ? 'Annulée' : 'Validée',
        payment: PAYMENT_LABELS[row.payment_method] || row.payment_method,
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price,
        total: row.quantity * row.price,
      });
    }
    ['price', 'total'].forEach(key => (sheet.getColumn(key).numFmt = EURO_FORMAT));

    const journal = workbook.addWorksheet('Journal');
    journal.columns = [
      { header: 'Date / Heure', key: 'created_at', width: 20 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'N° commande', key: 'order_id', width: 12 },
      { header: 'Rôle', key: 'actor_role', width: 10 },
      { header: 'Détails', key: 'details', width: 50 },
    ];
    journal.getRow(1).font = { bold: true };
    for (const a of auditRows) journal.addRow({ ...a, created_at: toLocalString(a.created_at) });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="commandes-${req.params.orgSlug}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    serverError(res, err);
  }
};
