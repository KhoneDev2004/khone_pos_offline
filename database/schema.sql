-- POS System SQLite Schema
-- ============================================

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  price REAL NOT NULL DEFAULT 0,
  cost_price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  image_path TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  amount_paid REAL DEFAULT 0,
  change_amount REAL DEFAULT 0,
  cashier TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced INTEGER DEFAULT 0
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'cashier',
  permissions TEXT DEFAULT '{}',
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Units table
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  abbreviation TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  module TEXT DEFAULT 'system',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cancelled / voided orders log
CREATE TABLE IF NOT EXISTS cancelled_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  invoice_number TEXT,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  cashier TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  cancelled_by TEXT DEFAULT '',
  items_snapshot TEXT DEFAULT '[]',
  original_date DATETIME,
  cancelled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
CREATE INDEX IF NOT EXISTS idx_orders_invoice ON orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_cancelled_orders_date ON cancelled_orders(cancelled_at);

-- Members / Customer loyalty table
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  total_spent REAL NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'percent_discount',
  discount_type TEXT DEFAULT 'percent',
  discount_value REAL DEFAULT 0,
  min_purchase REAL DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  buy_quantity INTEGER DEFAULT 0,
  get_quantity INTEGER DEFAULT 0,
  applicable_products TEXT DEFAULT '',
  applicable_categories TEXT DEFAULT '',
  member_only INTEGER DEFAULT 0,
  member_tier TEXT DEFAULT '',
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  points_required INTEGER DEFAULT 0,
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to existing tables (safe with IF NOT EXISTS via ALTER TABLE)
-- These will silently fail if columns already exist

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_name', 'ຮ້ານສະດວກຊື້');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_phone', '020-1234-5678');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_address', 'ນະຄອນຫຼວງວຽງຈັນ');
INSERT OR IGNORE INTO settings (key, value) VALUES ('receipt_paper_size', '80');
INSERT OR IGNORE INTO settings (key, value) VALUES ('receipt_header', 'ຂອບໃຈທີ່ມາອຸດໜູນ');
INSERT OR IGNORE INTO settings (key, value) VALUES ('receipt_footer', 'ກະລຸນາກັບມາໃໝ່');
INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'LAK');
INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_rate', '0');

-- Default units
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ອັນ', 'ອັນ');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ກິໂລກຣາມ', 'kg');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ລິດ', 'L');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ກ່ອງ', 'ກ່ອງ');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ແພັກ', 'ແພັກ');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ຂວດ', 'ຂວດ');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ກະປ໋ອງ', 'ກະປ໋ອງ');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ຖົງ', 'ຖົງ');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ແຜ່ນ', 'ແຜ່ນ');
INSERT OR IGNORE INTO units (name, abbreviation) VALUES ('ຟອງ', 'ຟອງ');
