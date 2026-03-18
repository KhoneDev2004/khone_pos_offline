import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';

// GET /api/promotions - List all promotions
export async function GET() {
    try {
        const db = getDb();
        const promotions = db.prepare('SELECT * FROM promotions ORDER BY created_at DESC').all();
        return successResponse({ promotions });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch promotions';
        logger.error(message, 'promotions-api');
        return errorResponse(message, 500);
    }
}

// POST /api/promotions - Create a new promotion
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name, description, type, discount_type, discount_value,
            min_purchase, min_quantity, buy_quantity, get_quantity,
            applicable_products, applicable_categories,
            member_only, member_tier, max_uses, points_required,
            start_date, end_date
        } = body;

        if (!name) return errorResponse('ກະລຸນາປ້ອນຊື່ໂປຣໂມຊັ່ນ', 400);

        const db = getDb();
        db.prepare(`INSERT INTO promotions (
            name, description, type, discount_type, discount_value,
            min_purchase, min_quantity, buy_quantity, get_quantity,
            applicable_products, applicable_categories,
            member_only, member_tier, max_uses, points_required,
            start_date, end_date, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(
            name, description || '', type || 'percent_discount',
            discount_type || 'percent', discount_value || 0,
            min_purchase || 0, min_quantity || 0,
            buy_quantity || 0, get_quantity || 0,
            applicable_products || '', applicable_categories || '',
            member_only ? 1 : 0, member_tier || '',
            max_uses || 0, points_required || 0,
            start_date || '', end_date || ''
        );

        logger.info(`Promotion created: ${name} (${type})`, 'promotions-api');
        return successResponse({ message: 'ເພີ່ມໂປຣໂມຊັ່ນສຳເລັດ' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create promotion';
        logger.error(message, 'promotions-api');
        return errorResponse(message, 500);
    }
}

// PUT /api/promotions - Update a promotion
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...fields } = body;
        if (!id) return errorResponse('Missing promotion ID', 400);

        const db = getDb();
        const allowedFields = [
            'name', 'description', 'type', 'discount_type', 'discount_value',
            'min_purchase', 'min_quantity', 'buy_quantity', 'get_quantity',
            'applicable_products', 'applicable_categories',
            'member_only', 'member_tier', 'max_uses', 'points_required',
            'start_date', 'end_date', 'active'
        ];

        const updates: string[] = [];
        const params: (string | number)[] = [];

        for (const [key, value] of Object.entries(fields)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                params.push(key === 'member_only' ? (value ? 1 : 0) : value as string | number);
            }
        }

        if (updates.length === 0) return errorResponse('No fields to update', 400);

        params.push(id);
        db.prepare(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        return successResponse({ message: 'ອັບເດດໂປຣໂມຊັ່ນສຳເລັດ' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update promotion';
        logger.error(message, 'promotions-api');
        return errorResponse(message, 500);
    }
}

// DELETE /api/promotions - Delete a promotion
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return errorResponse('Missing promotion ID', 400);

        const db = getDb();
        db.prepare('DELETE FROM promotions WHERE id = ?').run(id);

        return successResponse({ message: 'ລຶບໂປຣໂມຊັ່ນສຳເລັດ' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete promotion';
        logger.error(message, 'promotions-api');
        return errorResponse(message, 500);
    }
}
