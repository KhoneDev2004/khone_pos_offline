const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

try {
    const dbPath = path.join(process.cwd(), 'data', 'pos.db');
    console.log('Connecting to', dbPath);
    
    // Check if file exists
    if (!fs.existsSync(dbPath)) {
        console.log('DB file not found at', dbPath);
        process.exit(1);
    }
    
    const db = new Database(dbPath, { timeout: 8000 });
    
    // Check existing columns
    const columns = db.pragma('table_info(orders)');
    const hasInvoiceNumber = columns.some(c => c.name === 'invoice_number');
    console.log('Has invoice_number:', hasInvoiceNumber);
    
    if (!hasInvoiceNumber) {
        console.log('Adding invoice_number column...');
        db.exec("ALTER TABLE orders ADD COLUMN invoice_number TEXT");
        console.log('Column added successfully.');
    }
    
    db.close();
    console.log('Done.');
} catch (err) {
    console.error('Migration failed:', err);
}
