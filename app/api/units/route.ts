import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// GET /api/units
export async function GET() {
    try {
        const db = getDb();
        const units = db.prepare('SELECT * FROM units ORDER BY id ASC').all();
        return successResponse({ units });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch units';
        return errorResponse(message, 500);
    }
}

// POST /api/units
export async function POST(req: NextRequest) {
    try {
        const { name, abbreviation } = await req.json();
        if (!name) return errorResponse('Unit name is required', 400);
        const db = getDb();
        const result = db.prepare('INSERT INTO units (name, abbreviation) VALUES (?, ?)').run(name, abbreviation || name);
        return successResponse({ id: result.lastInsertRowid, name, abbreviation: abbreviation || name }, 'Unit created', 201);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create unit';
        return errorResponse(message, 500);
    }
}

// PUT /api/units
export async function PUT(req: NextRequest) {
    try {
        const { id, name, abbreviation } = await req.json();
        if (!id || !name) return errorResponse('ID and name required', 400);
        const db = getDb();
        db.prepare('UPDATE units SET name = ?, abbreviation = ? WHERE id = ?').run(name, abbreviation || name, id);
        return successResponse(null, 'Unit updated');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update unit';
        return errorResponse(message, 500);
    }
}

// DELETE /api/units
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return errorResponse('Unit ID required', 400);
        const db = getDb();
        db.prepare('DELETE FROM units WHERE id = ?').run(Number(id));
        return successResponse(null, 'Unit deleted');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete unit';
        return errorResponse(message, 500);
    }
}
