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

// GET /api/products/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = ensureColumns();
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

        if (!product) {
            return errorResponse('Product not found', 404);
        }

        return successResponse(product);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch product';
        logger.error(message, 'products-api');
        return errorResponse(message, 500);
    }
}

// PUT /api/products/[id]
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, barcode, price, cost_price, stock, category, unit, image_path } = body;

        const db = ensureColumns();
        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

        if (!existing) {
            return errorResponse('Product not found', 404);
        }

        // Check duplicate barcode (exclude current product)
        if (barcode) {
            const duplicate = db.prepare(
                'SELECT id FROM products WHERE barcode = ? AND id != ?'
            ).get(barcode, id);
            if (duplicate) {
                return errorResponse('Another product with this barcode already exists', 409);
            }
        }

        db.prepare(
            `UPDATE products SET name = ?, barcode = ?, price = ?, cost_price = ?, stock = ?, category = ?, unit = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(
            name ?? (existing as Record<string, unknown>).name,
            barcode ?? (existing as Record<string, unknown>).barcode,
            price ?? (existing as Record<string, unknown>).price,
            cost_price ?? (existing as Record<string, unknown>).cost_price ?? 0,
            stock ?? (existing as Record<string, unknown>).stock,
            category ?? (existing as Record<string, unknown>).category,
            unit ?? (existing as Record<string, unknown>).unit ?? '',
            image_path ?? (existing as Record<string, unknown>).image_path,
            id
        );

        const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        logger.info(`Product updated: ID ${id}`, 'products-api');
        return successResponse(updated, 'Product updated successfully');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update product';
        logger.error(message, 'products-api');
        return errorResponse(message, 500);
    }
}

// DELETE /api/products/[id]
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = ensureColumns();

        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!existing) {
            return errorResponse('Product not found', 404);
        }

        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        logger.info(`Product deleted: ID ${id}`, 'products-api');
        return successResponse(null, 'Product deleted successfully');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete product';
        logger.error(message, 'products-api');
        return errorResponse(message, 500);
    }
}
