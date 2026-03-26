import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (db) {
        // Even if db exists, ensure migrations ran
        return db;
    }

    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = process.env.DATABASE_PATH
        ? path.resolve(process.env.DATABASE_PATH)
        : path.join(dbDir, 'pos.db');

    db = new Database(dbPath);

    // Enable WAL mode for better concurrent performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    // Initialize schema
    initializeSchema(db);

    // Run migrations for existing databases
    runMigrations(db);

    // Seed default admin user
    seedAdminUser(db);

    console.log('[DB] Database initialized with all migrations');
    return db;
}

function initializeSchema(database: Database.Database): void {
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');

    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        database.exec(schema);
    }
}

function runMigrations(database: Database.Database): void {
    // Add cost_price column if not exists
    try {
        database.exec("ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0");
    } catch (e) {
        if (!(e as Error).message.includes('duplicate column')) {
            console.error('[DB] Migration error (cost_price):', e);
        }
    }

    // Add unit column if not exists
    try {
        database.exec("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT ''");
    } catch (e) {
        if (!(e as Error).message.includes('duplicate column')) {
            console.error('[DB] Migration error (unit):', e);
        }
    }

    // Add invoice_number column if not exists
    try {
        database.exec("ALTER TABLE orders ADD COLUMN invoice_number TEXT");
        console.log('[DB] Added invoice_number column to orders table.');
    } catch (e) {
        if (!(e as Error).message.includes('duplicate column')) {
            console.error('[DB] Migration error (invoice_number):', e);
        }
    }

    // Add full_name column to users if not exists
    try {
        database.exec("ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT ''");
    } catch { /* column already exists */ }

    // Add permissions column to users if not exists
    try {
        database.exec("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'");
    } catch { /* column already exists */ }

    // Add active column to users if not exists
    try {
        database.exec("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1");
    } catch { /* column already exists */ }

    // Add image_path column to products if not exists
    try {
        database.exec("ALTER TABLE products ADD COLUMN image_path TEXT DEFAULT ''");
    } catch { /* column already exists */ }
}

function seedAdminUser(database: Database.Database): void {
    const hash = bcrypt.hashSync('Admin123', 10);
    const permissions = JSON.stringify({
        sell: true,
        view_reports: true,
        manage_products: true,
        manage_stock: true,
        manage_users: true,
        settings: true,
    });
    
    const existing = database.prepare('SELECT id FROM users WHERE username = ?').get('Admin');
    if (!existing) {
        database.prepare(
            'INSERT INTO users (username, password_hash, full_name, role, permissions, active) VALUES (?, ?, ?, ?, ?, 1)'
        ).run('Admin', hash, 'ເຈົ້າຂອງຮ້ານ', 'admin', permissions);
    } else {
        // Force update the password in case it was changed or corrupted
        database.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'Admin');
    }
}

export function closeDb(): void {
    if (db) {
        db.close();
        db = null;
    }
}

// Helper: run a transaction
export function runTransaction<T>(fn: (db: Database.Database) => T): T {
    const database = getDb();
    const transaction = database.transaction(fn);
    return transaction(database);
}

export default getDb;
