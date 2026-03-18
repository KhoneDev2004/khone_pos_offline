import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';
import * as XLSX from 'xlsx';

// POST /api/import - Import products from Excel
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return errorResponse('No file uploaded', 400);
        }

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            return errorResponse('Only Excel files (.xlsx, .xls) are supported', 400);
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return errorResponse('Excel file has no sheets', 400);
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        if (rows.length === 0) {
            return errorResponse('Excel file has no data rows', 400);
        }

        const db = getDb();
        let imported = 0;
        let skipped = 0;
        let updated = 0;
        const errors: string[] = [];

        const insertStmt = db.prepare(
            'INSERT INTO products (name, barcode, price, cost_price, stock, category, unit) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        const updateStmt = db.prepare(
            'UPDATE products SET name = ?, price = ?, cost_price = ?, stock = ?, category = ?, unit = ?, updated_at = CURRENT_TIMESTAMP WHERE barcode = ?'
        );

        const checkStmt = db.prepare('SELECT id FROM products WHERE barcode = ?');

        const transaction = db.transaction(() => {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2; // Excel row number (header is row 1)

                const name = String(row.name || row.Name || row['ชื่อ'] || row['ຊື່'] || '').trim();
                const barcode = String(row.barcode || row.Barcode || row['บาร์โค้ด'] || row['ບາໂຄດ'] || '').trim();
                const price = parseFloat(String(row.price || row.Price || row['ราคา'] || row['ລາຄາ'] || 0));
                const cost_price = parseFloat(String(row.cost_price || row.CostPrice || row['ราคาทุน'] || row['ລາຄາທຶນ'] || 0));
                const stock = parseInt(String(row.stock || row.Stock || row['สต็อก'] || row['ສະຕ໊ອກ'] || 0));
                const category = String(row.category || row.Category || row['หมวด'] || row['ໝວດ'] || '').trim();
                const unit = String(row.unit || row.Unit || row['หน่วย'] || row['ໜ່ວຍ'] || '').trim();

                if (!name) {
                    errors.push(`Row ${rowNum}: Missing product name`);
                    skipped++;
                    continue;
                }

                if (isNaN(price) || price < 0) {
                    errors.push(`Row ${rowNum}: Invalid price for "${name}"`);
                    skipped++;
                    continue;
                }

                try {
                    if (barcode) {
                        const existing = checkStmt.get(barcode);
                        if (existing) {
                            updateStmt.run(name, price, cost_price || 0, stock, category, unit, barcode);
                            updated++;
                            continue;
                        }
                    }

                    insertStmt.run(name, barcode || null, price, cost_price || 0, stock, category, unit);
                    imported++;
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    errors.push(`Row ${rowNum}: ${msg}`);
                    skipped++;
                }
            }
        });

        transaction();

        logger.info(
            `Excel import: ${imported} inserted, ${updated} updated, ${skipped} skipped from "${file.name}"`,
            'import-api'
        );

        return successResponse(
            { imported, updated, skipped, totalRows: rows.length, errors: errors.slice(0, 20) },
            `Import complete: ${imported} new, ${updated} updated, ${skipped} skipped`
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import Excel';
        logger.error(message, 'import-api');
        return errorResponse(message, 500);
    }
}
