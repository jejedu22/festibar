// backend/config/database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.env.SQLITE_FILE || './bar.db');

// --- Helpers promesses (utilisés par les migrations et les contrôleurs) ---
db.runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
db.getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
db.allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

async function ensureColumn(table, column, definition) {
  const cols = await db.allAsync(`PRAGMA table_info(${table})`);
  if (!cols.some(c => c.name === column)) {
    await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`🔧 Migration : colonne ${table}.${column} ajoutée`);
  }
}

async function init() {
  // Activer les clés étrangères
  await db.runAsync('PRAGMA foreign_keys = ON');
  // Mode WAL → meilleur pour accès concurrents
  await db.runAsync('PRAGMA journal_mode = WAL');
  // Cache plus grand pour réduire I/O
  await db.runAsync('PRAGMA cache_size = 10000');
  // Synchro moins agressive → réduit latence (risque de perte en crash)
  await db.runAsync('PRAGMA synchronous = NORMAL');
  // Indices automatiques
  await db.runAsync('PRAGMA automatic_index = ON');

  await db.runAsync(`CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    staff_password TEXT
  )`);

  await db.runAsync(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(organization_id, name),
    FOREIGN KEY(organization_id) REFERENCES organizations(id)
  )`);

  await db.runAsync(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    category_id INTEGER,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    available INTEGER DEFAULT 1,
    FOREIGN KEY(organization_id) REFERENCES organizations(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);

  // Les commandes ne sont jamais effacées par une annulation : status = 'cancelled'
  await db.runAsync(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    total REAL NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'active',
    payment_method TEXT NOT NULL DEFAULT 'cash',
    client_id TEXT,
    cancelled_at TEXT,
    cancelled_by TEXT,
    FOREIGN KEY(organization_id) REFERENCES organizations(id)
  )`);

  await db.runAsync(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL NOT NULL,
    sort_order INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  // Demandes de contact / accès
  await db.runAsync(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Journal des opérations sensibles (annulations, suppressions)
  await db.runAsync(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    order_id INTEGER,
    actor_role TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // --- Migrations des bases existantes ---
  // Toute colonne utilisée par l'application est ajoutée si elle manque (bases créées par
  // d'anciennes versions). ALTER TABLE ne permet pas NOT NULL sans valeur par défaut :
  // les définitions ci-dessous sont donc compatibles avec un ajout sur une table déjà remplie.
  const expectedColumns = {
    organizations: { staff_password: 'TEXT' },
    categories: { sort_order: 'INTEGER DEFAULT 0' },
    products: {
      category_id: 'INTEGER',
      available: 'INTEGER DEFAULT 1',
    },
    orders: {
      timestamp: 'TEXT',
      status: "TEXT NOT NULL DEFAULT 'active'",
      payment_method: "TEXT NOT NULL DEFAULT 'cash'",
      client_id: 'TEXT',
      cancelled_at: 'TEXT',
      cancelled_by: 'TEXT',
    },
    order_items: {
      quantity: 'INTEGER NOT NULL DEFAULT 1',
      price: 'REAL NOT NULL DEFAULT 0',
      sort_order: 'INTEGER',
    },
    contacts: { created_at: 'TEXT' },
  };
  for (const [table, columns] of Object.entries(expectedColumns)) {
    for (const [column, definition] of Object.entries(columns)) {
      await ensureColumn(table, column, definition);
    }
  }

  // Lignes antérieures à l'ajout des dates : date inconnue, on met celle de la migration
  const { changes: undated } = await db.runAsync(`UPDATE orders SET timestamp = CURRENT_TIMESTAMP WHERE timestamp IS NULL`);
  if (undated) console.log(`🔧 Migration : ${undated} commande(s) sans date datée d'aujourd'hui (date réelle inconnue)`);
  await db.runAsync(`UPDATE contacts SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`);

  // Index
  await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at)`);
  await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_orders_org ON orders(organization_id, timestamp)`);
  await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);
  // Idempotence des commandes envoyées hors-ligne puis resynchronisées
  await db.runAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_id ON orders(organization_id, client_id)`);
}

db.ready = init();
db.ready.catch(err => {
  console.error('❌ Initialisation de la base impossible :', err);
  process.exit(1);
});

module.exports = db;
