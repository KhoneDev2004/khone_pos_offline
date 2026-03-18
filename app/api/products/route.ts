import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';

// Ensure new columns exist on every call (handles old databases)
function ensureColumns() {
    const db = getDb();
    try { db.exec("ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT ''"); } catch { /* exists */ }
    return db;
}

// GET /api/products - List products with search/pagination
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        const db = ensureColumns();

        let products;
        let total: number;

        if (search) {
            const searchTerm = `%${search}%`;
            products = db.prepare(
                'SELECT * FROM products WHERE name LIKE ? OR barcode LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?'
            ).all(searchTerm, searchTerm, limit, offset);

            const countResult = db.prepare(
                'SELECT COUNT(*) as count FROM products WHERE name LIKE ? OR barcode LIKE ?'
            ).get(searchTerm, searchTerm) as { count: number };
            total = countResult.count;
        } else {
            products = db.prepare(
                'SELECT * FROM products ORDER BY name ASC LIMIT ? OFFSET ?'
            ).all(limit, offset);

            const countResult = db.prepare(
                'SELECT COUNT(*) as count FROM products'
            ).get() as { count: number };
            total = countResult.count;
        }

        return successResponse({
            products,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch products';
        logger.error(message, 'products-api');
        return errorResponse(message, 500);
    }
}

// POST /api/products - Create a product
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, barcode, price, cost_price, stock, category, unit, image_path } = body;

        if (!name || price === undefined) {
            return errorResponse('Name and price are required', 400);
        }

        const db = ensureColumns();

        // Check duplicate barcode
        if (barcode) {
            const existing = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode);
            if (existing) {
                return errorResponse('Product with this barcode already exists', 409);
            }
        }

        const result = db.prepare(
            'INSERT INTO products (name, barcode, price, cost_price, stock, category, unit, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(name, barcode || null, price, cost_price || 0, stock || 0, category || '', unit || '', image_path || '');

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

        logger.info(`Product created: ${name}`, 'products-api');
        return successResponse(product, 'Product created successfully', 201);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create product';
        logger.error(message, 'products-api');
        return errorResponse(message, 500);
    }
}
