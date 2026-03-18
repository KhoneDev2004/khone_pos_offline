import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';

// GET /api/categories
export async function GET() {
    try {
        const db = getDb();
        // Get categories from dedicated table + merge product counts
        const categories = db.prepare(`
            SELECT c.id, c.name, c.description, c.created_at,
                   COALESCE(pc.product_count, 0) as product_count
            FROM categories c
            LEFT JOIN (
                SELECT category as name, COUNT(*) as product_count 
                FROM products WHERE category != '' GROUP BY category
            ) pc ON pc.name = c.name
            ORDER BY c.name ASC
        `).all();

        // Also add categories only in products but not in categories table
        const productOnlyCategories = db.prepare(`
            SELECT DISTINCT category as name, COUNT(*) as product_count
            FROM products 
            WHERE category != '' AND category NOT IN (SELECT name FROM categories)
            GROUP BY category
        `).all();

        return successResponse({ 
            categories: [...categories, ...(productOnlyCategories as { name: string; product_count: number }[]).map(c => ({
                id: null, name: c.name, description: '', product_count: c.product_count, created_at: null
            }))]
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch categories';
        logger.error(message, 'categories-api');
        return errorResponse(message, 500);
    }
}

// POST /api/categories — Add category
export async function POST(req: NextRequest) {
    try {
        const { name, description } = await req.json();
        if (!name) return errorResponse('Category name is required', 400);
        const db = getDb();
        const result = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)').run(name, description || '');
        return successResponse({ id: result.lastInsertRowid, name, description: description || '' }, 'Category created', 201);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create category';
        logger.error(message, 'categories-api');
        return errorResponse(message, 500);
    }
}

// PUT /api/categories — Update category
export async function PUT(req: NextRequest) {
    try {
        const { id, name, old_name, description } = await req.json();
        if (!name) return errorResponse('Category name required', 400);
        const db = getDb();
        
        if (id) {
            db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description || '', id);
        }
        // Also update all products with old category name
        if (old_name && old_name !== name) {
            db.prepare('UPDATE products SET category = ? WHERE category = ?').run(name, old_name);
        }
        return successResponse(null, 'Category updated');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update category';
        logger.error(message, 'categories-api');
        return errorResponse(message, 500);
    }
}

// DELETE /api/categories
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const name = searchParams.get('name');
        const db = getDb();
        
        if (id) db.prepare('DELETE FROM categories WHERE id = ?').run(Number(id));
        if (name) {
            db.prepare('DELETE FROM categories WHERE name = ?').run(name);
            db.prepare("UPDATE products SET category = '' WHERE category = ?").run(name);
        }
        return successResponse(null, 'Category deleted');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete category';
        logger.error(message, 'categories-api');
        return errorResponse(message, 500);
    }
}
