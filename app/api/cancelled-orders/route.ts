import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// GET /api/cancelled-orders — fetch cancelled orders with optional date filtering
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');

        const db = getDb();
        // Ensure table exists
        db.exec(`CREATE TABLE IF NOT EXISTS cancelled_orders (
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
        )`);

        let query = 'SELECT * FROM cancelled_orders';
        const params: string[] = [];

        if (dateFrom && dateTo) {
            query += ' WHERE cancelled_at BETWEEN ? AND ?';
            params.push(dateFrom, dateTo);
        } else if (dateFrom) {
            query += ' WHERE cancelled_at >= ?';
            params.push(dateFrom);
        } else if (dateTo) {
            query += ' WHERE cancelled_at <= ?';
            params.push(dateTo);
        }

        query += ' ORDER BY cancelled_at DESC';

        const rows = db.prepare(query).all(...params);
        return successResponse({ cancelled_orders: rows });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch cancelled orders';
        return errorResponse(message, 500);
    }
}
