import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// GET /api/logs - Fetch system logs
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const level = searchParams.get('level') || '';
        const module = searchParams.get('module') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        const db = getDb();

        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (level) {
            conditions.push('level = ?');
            params.push(level);
        }

        if (module) {
            conditions.push('module = ?');
            params.push(module);
        }

        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from) {
            conditions.push('timestamp >= ?');
            params.push(from);
        }
        if (to) {
            conditions.push('timestamp < ?');
            params.push(to);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const logs = db.prepare(
            `SELECT * FROM logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
        ).all(...params, limit, offset);

        const countResult = db.prepare(
            `SELECT COUNT(*) as count FROM logs ${whereClause}`
        ).get(...params) as { count: number };

        return successResponse({
            logs,
            pagination: {
                page,
                limit,
                total: countResult.count,
                totalPages: Math.ceil(countResult.count / limit),
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch logs';
        return errorResponse(message, 500);
    }
}
