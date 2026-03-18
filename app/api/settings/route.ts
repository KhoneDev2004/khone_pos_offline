import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// GET /api/settings
export async function GET() {
    try {
        const db = getDb();
        const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
        const data: Record<string, string> = {};
        for (const row of rows) {
            data[row.key] = row.value;
        }
        return successResponse(data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch settings';
        return errorResponse(message, 500);
    }
}

// POST /api/settings - Save settings
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const db = getDb();
        const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        const transaction = db.transaction(() => {
            for (const [key, value] of Object.entries(body)) {
                upsert.run(key, String(value));
            }
        });
        transaction();
        return successResponse(null, 'Settings saved');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save settings';
        return errorResponse(message, 500);
    }
}
