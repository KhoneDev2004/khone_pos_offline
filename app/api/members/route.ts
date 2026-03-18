import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';

// GET /api/members - List all members
export async function GET(req: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const phone = searchParams.get('phone') || '';

        let query = 'SELECT * FROM members';
        const params: string[] = [];

        if (phone) {
            query += ' WHERE phone = ?';
            params.push(phone);
        } else if (search) {
            query += ' WHERE name LIKE ? OR phone LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY updated_at DESC';

        const members = db.prepare(query).all(...params);
        return successResponse({ members });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch members';
        logger.error(message, 'members-api');
        return errorResponse(message, 500);
    }
}

// POST /api/members - Create a new member
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, note } = body;

        if (!name || !phone) {
            return errorResponse('ກະລຸນາປ້ອນຊື່ ແລະ ເບີໂທ', 400);
        }

        const db = getDb();

        // Check if phone already exists
        const existing = db.prepare('SELECT id FROM members WHERE phone = ?').get(phone);
        if (existing) {
            return errorResponse('ເບີໂທນີ້ມີຢູ່ແລ້ວໃນລະບົບ', 400);
        }

        db.prepare(
            'INSERT INTO members (name, phone, note) VALUES (?, ?, ?)'
        ).run(name.trim(), phone.trim(), (note || '').trim());

        logger.info(`New member: ${name} (${phone})`, 'members-api');
        return successResponse({ message: 'ເພີ່ມສະມາຊິກສຳເລັດ' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create member';
        logger.error(message, 'members-api');
        return errorResponse(message, 500);
    }
}

// PUT /api/members - Update member info
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, phone, note } = body;

        if (!id) return errorResponse('Missing member ID', 400);

        const db = getDb();

        // Check for phone uniqueness (exclude current member)
        if (phone) {
            const existing = db.prepare('SELECT id FROM members WHERE phone = ? AND id != ?').get(phone, id);
            if (existing) {
                return errorResponse('ເບີໂທນີ້ມີຢູ່ແລ້ວໃນລະບົບ', 400);
            }
        }

        db.prepare(
            'UPDATE members SET name = ?, phone = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run((name || '').trim(), (phone || '').trim(), (note || '').trim(), id);

        return successResponse({ message: 'ແກ້ໄຂສະມາຊິກສຳເລັດ' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update member';
        logger.error(message, 'members-api');
        return errorResponse(message, 500);
    }
}

// PATCH /api/members - Add purchase to member (accumulate total_spent, points, visit_count)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, amount } = body;

        if (!phone || !amount) return errorResponse('Missing phone or amount', 400);

        const db = getDb();
        const member = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone) as { id: number; total_spent: number; points: number; visit_count: number } | undefined;

        if (!member) return errorResponse('ບໍ່ພົບສະມາຊິກ', 404);

        // 1 point per 10,000 kip spent
        const newPoints = Math.floor(amount / 10000);

        db.prepare(
            'UPDATE members SET total_spent = total_spent + ?, points = points + ?, visit_count = visit_count + 1, updated_at = CURRENT_TIMESTAMP WHERE phone = ?'
        ).run(amount, newPoints, phone);

        return successResponse({
            message: 'ອັບເດດຍອດສະມາຊິກສຳເລັດ',
            added_points: newPoints,
            new_total_spent: member.total_spent + amount,
            new_points: member.points + newPoints,
            new_visit_count: member.visit_count + 1,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update member purchase';
        logger.error(message, 'members-api');
        return errorResponse(message, 500);
    }
}

// DELETE /api/members - Delete a member
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return errorResponse('Missing member ID', 400);

        const db = getDb();
        db.prepare('DELETE FROM members WHERE id = ?').run(id);

        return successResponse({ message: 'ລຶບສະມາຊິກສຳເລັດ' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete member';
        logger.error(message, 'members-api');
        return errorResponse(message, 500);
    }
}
