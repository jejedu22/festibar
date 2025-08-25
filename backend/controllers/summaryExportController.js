const db = require('../config/database');
const ExcelJS = require('exceljs');

exports.exportOrders = async (req, res) => {
  const orgId = req.organizationId;

  // Récupérer toutes les commandes et leurs items
  const query = `
    SELECT o.id AS order_id, o.timestamp, oi.product_id, p.name AS product_name, oi.quantity, oi.price
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.organization_id = ?
    ORDER BY o.timestamp ASC
  `;

  db.all(query, [orgId], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Commandes');

    // Colonnes
    sheet.columns = [
      { header: 'ID Commande', key: 'order_id', width: 12 },
      { header: 'Date / Heure', key: 'timestamp', width: 20 },
      { header: 'Produit', key: 'product_name', width: 25 },
      { header: 'Quantité', key: 'quantity', width: 10 },
      { header: 'Prix Unitaire', key: 'price', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
    ];

    // Ajouter les lignes
    rows.forEach(row => {
      sheet.addRow({
        order_id: row.order_id,
        timestamp: row.timestamp,
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price,
        total: row.quantity * row.price,
      });
    });

    // Formater les colonnes monétaires
    ['price', 'total'].forEach(key => {
      sheet.getColumn(key).numFmt = '"€"#,##0.00;[Red]-"€"#,##0.00';
    });

    // Répondre avec le fichier XLSX
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="commandes.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  });
};
