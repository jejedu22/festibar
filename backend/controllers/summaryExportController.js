// backend/controllers/summaryExportController.js
const db = require('../config/database');
const ExcelJS = require('exceljs');
const { serverError } = require('../utils/http');
const { createGate } = require('../utils/concurrency');
const { serviceDay, toLocalString } = require('../utils/time');

const PAYMENT_LABELS = { cash: 'Espèces', card: 'Carte', other: 'Autre' };
const EURO_FORMAT = '#,##0.00 "€";[Red]-#,##0.00 "€"';

// Un export coûte du CPU et de la mémoire : au plus EXPORT_CONCURRENCY en même temps, les autres
// attendent leur tour. Avec 20 gestionnaires qui exportent ensemble, le conteneur n'est plus saturé.
const gate = createGate({ concurrency: Number.parseInt(process.env.EXPORT_CONCURRENCY || '2', 10) || 2, maxQueue: 50 });

const round2 = n => Math.round(n * 100) / 100;

// Lecture ligne à ligne : la table n'est jamais chargée en entier en mémoire
function eachRow(sql, params, onRow) {
  return new Promise((resolve, reject) => {
    let failure = null;
    db.each(
      sql,
      params,
      (err, row) => {
        if (failure) return;
        if (err) { failure = err; return; }
        try { onRow(row); } catch (e) { failure = e; } // jamais d'exception dans le callback natif
      },
      err => (err || failure ? reject(err || failure) : resolve())
    );
  });
}

// Le classeur est écrit directement dans la réponse, feuille par feuille et ligne par ligne :
// la mémoire utilisée ne dépend plus du nombre de commandes.
async function writeWorkbook(req, res) {
  const orgId = req.organizationId;
  if (res.destroyed || res.writableEnded) return; // le client est parti pendant l'attente

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="commandes-${req.params.orgSlug}.xlsx"`);
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true, useSharedStrings: false });

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
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.commit();

  await eachRow(
    `SELECT o.id AS order_id, o.timestamp, o.status, o.payment_method, o.cancelled_at,
            p.name AS product_name, oi.quantity, oi.price
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN products p ON p.id = oi.product_id
     WHERE o.organization_id = ?
     ORDER BY o.timestamp ASC, o.id ASC, oi.id ASC`,
    [orgId],
    row => {
      const line = sheet.addRow({
        day: serviceDay(row.timestamp),
        timestamp: toLocalString(row.timestamp),
        order_id: row.order_id,
        status: row.status === 'cancelled' ? 'Annulée' : 'Validée',
        payment: PAYMENT_LABELS[row.payment_method] || row.payment_method,
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price,
        total: round2(row.quantity * row.price),
      });
      line.getCell('price').numFmt = EURO_FORMAT;
      line.getCell('total').numFmt = EURO_FORMAT;
      line.commit();
    }
  );
  sheet.commit();

  const journal = workbook.addWorksheet('Journal');
  journal.columns = [
    { header: 'Date / Heure', key: 'created_at', width: 20 },
    { header: 'Action', key: 'action', width: 20 },
    { header: 'N° commande', key: 'order_id', width: 12 },
    { header: 'Rôle', key: 'actor_role', width: 10 },
    { header: 'Détails', key: 'details', width: 50 },
  ];
  const journalHeader = journal.getRow(1);
  journalHeader.font = { bold: true };
  journalHeader.commit();

  await eachRow(
    `SELECT created_at, action, order_id, actor_role, details FROM audit_log
     WHERE organization_id = ? ORDER BY id ASC`,
    [orgId],
    a => journal.addRow({ ...a, created_at: toLocalString(a.created_at) }).commit()
  );
  journal.commit();

  await workbook.commit(); // termine l'archive et la réponse
}

exports.exportOrders = async (req, res) => {
  try {
    await gate.run(() => writeWorkbook(req, res));
  } catch (err) {
    if (err.code === 'GATE_FULL') {
      res.set('Retry-After', '10');
      return res.status(503).json({ error: 'Trop d’exports en cours, réessayez dans quelques secondes.' });
    }
    if (res.headersSent) {
      // Fichier déjà en cours d'envoi : on coupe la connexion pour que le téléchargement échoue
      // franchement au lieu de livrer un classeur tronqué qui semblerait valide.
      console.error('Export interrompu :', err);
      return res.destroy(err);
    }
    res.removeHeader('Content-Disposition'); // la réponse d'erreur n'est pas un fichier à télécharger
    serverError(res, err);
  }
};
