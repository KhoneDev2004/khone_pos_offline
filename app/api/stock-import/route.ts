import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';

interface StockImportItem {
    barcode: string;
    quantity: number;
}

// GET /api/stock-import?barcode=xxx — Look up product by barcode
export async function GET(req: NextRequest) {
    try {
        const barcode = req.nextUrl.searchParams.get('barcode');
        if (!barcode) {
            return errorResponse('ກະລຸນາປ້ອນບາໂຄ້ດ', 400);
        }

        const db = getDb();
        const product = db.prepare(
            'SELECT id, name, barcode, price, cost_price, stock, category, unit FROM products WHERE barcode = ?'
        ).get(barcode) as Record<string, unknown> | undefined;

        if (!product) {
            return errorResponse('ບໍ່ພົບສິນຄ້າທີ່ມີບາໂຄ້ດນີ້', 404);
        }

        return successResponse(product);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to lookup product';
        logger.error(message, 'stock-import-api');
        return errorResponse(message, 500);
    }
}

// POST /api/stock-import — Import stock by barcode list
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const items: StockImportItem[] = body.items;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return errorResponse('ບໍ່ມີລາຍການນຳເຂົ້າ', 400);
        }

        const db = getDb();
        let updated = 0;
        const errors: string[] = [];

        const findStmt = db.prepare('SELECT id, name, stock FROM products WHERE barcode = ?');
        const updateStmt = db.prepare('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE barcode = ?');

        const transaction = db.transaction(() => {
            for (const item of items) {
                if (!item.barcode || !item.quantity || item.quantity <= 0) {
                    errors.push(`ບາໂຄ້ດ ${item.barcode}: ຂໍ້ມູນບໍ່ຖືກຕ້ອງ`);
                    continue;
                }

                const product = findStmt.get(item.barcode) as Record<string, unknown> | undefined;
                if (!product) {
                    errors.push(`ບາໂຄ້ດ ${item.barcode}: ບໍ່ພົບສິນຄ້ານີ້ໃນລະບົບ`);
                    continue;
                }

                try {
                    updateStmt.run(item.quantity, item.barcode);
                    updated++;
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    errors.push(`ບາໂຄ້ດ ${item.barcode}: ${msg}`);
                }
            }
        });

        transaction();

        logger.info(
            `Stock import: ${updated} products updated, ${errors.length} errors`,
            'stock-import-api'
        );

        return successResponse(
            { updated, totalItems: items.length, errors: errors.slice(0, 20) },
            `ນຳເຂົ້າສຳເລັດ: ${updated} ລາຍການ`
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import stock';
        logger.error(message, 'stock-import-api');
        return errorResponse(message, 500);
    }
}
