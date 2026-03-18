import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';
import bcrypt from 'bcryptjs';

// POST /api/auth - Login
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username, password } = body;

        if (!username || !password) {
            return errorResponse('Username and password are required', 400);
        }

        const db = getDb();

        const user = db.prepare(
            'SELECT * FROM users WHERE username = ?'
        ).get(username) as Record<string, unknown> | undefined;

        if (!user) {
            logger.warn(`Login failed: user "${username}" not found`, 'auth');
            return errorResponse('Invalid credentials', 401);
        }

        if (!(user.active as number)) {
            return errorResponse('Account is disabled', 403);
        }

        const isValid = bcrypt.compareSync(password, user.password_hash as string);

        if (!isValid) {
            logger.warn(`Login failed: wrong password for "${username}"`, 'auth');
            return errorResponse('Invalid credentials', 401);
        }

        logger.info(`User logged in: ${username}`, 'auth');

        let permissions = {};
        try { permissions = JSON.parse(user.permissions as string || '{}'); } catch { /* ignore */ }

        return successResponse({
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name || user.username,
                role: user.role,
                permissions,
            },
        }, 'Login successful');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        logger.error(message, 'auth');
        return errorResponse(message, 500);
    }
}

// PUT /api/auth - Register new user (admin only)
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { username, password, full_name, role, permissions } = body;

        if (!username || !password) {
            return errorResponse('Username and password are required', 400);
        }

        const validRoles = ['admin', 'cashier', 'manager'];
        if (role && !validRoles.includes(role)) {
            return errorResponse(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
        }

        const db = getDb();

        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return errorResponse('Username already exists', 409);
        }

        const password_hash = bcrypt.hashSync(password, 10);
        const permJson = JSON.stringify(permissions || {
            sell: true,
            view_reports: role === 'admin' || role === 'manager',
            manage_products: role === 'admin' || role === 'manager',
            manage_stock: role === 'admin' || role === 'manager',
            manage_users: role === 'admin',
            settings: role === 'admin',
        });

        const result = db.prepare(
            'INSERT INTO users (username, password_hash, full_name, role, permissions, active) VALUES (?, ?, ?, ?, ?, 1)'
        ).run(username, password_hash, full_name || username, role || 'cashier', permJson);

        logger.info(`User registered: ${username} (${role || 'cashier'})`, 'auth');

        return successResponse({
            user: { id: result.lastInsertRowid, username, full_name: full_name || username, role: role || 'cashier' }
        }, 'User registered successfully', 201);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        logger.error(message, 'auth');
        return errorResponse(message, 500);
    }
}

// PATCH /api/auth - Change password OR update user info
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, action } = body;

        if (!user_id) return errorResponse('user_id is required', 400);

        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as Record<string, unknown> | undefined;
        if (!user) return errorResponse('User not found', 404);

        // Update user info (role, permissions, full_name, active)
        if (action === 'update_info') {
            const { full_name, role, permissions, active } = body;
            const validRoles = ['admin', 'cashier', 'manager'];
            if (role && !validRoles.includes(role)) {
                return errorResponse(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
            }

            const updates: string[] = [];
            const params: (string | number)[] = [];

            if (full_name !== undefined) { updates.push('full_name = ?'); params.push(full_name); }
            if (role !== undefined) { updates.push('role = ?'); params.push(role); }
            if (permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
            if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

            if (updates.length === 0) return errorResponse('No fields to update', 400);

            params.push(user_id);
            db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

            logger.info(`User info updated for ID: ${user_id}`, 'auth');
            return successResponse(null, 'User updated successfully');
        }

        // Change password (default action)
        const { old_password, new_password } = body;
        if (!new_password) return errorResponse('new_password is required', 400);

        // If old_password provided, verify it (self-change)
        if (old_password) {
            const isValid = bcrypt.compareSync(old_password, user.password_hash as string);
            if (!isValid) return errorResponse('Old password is incorrect', 401);
        }

        const hash = bcrypt.hashSync(new_password, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user_id);

        logger.info(`Password changed for user ID: ${user_id}`, 'auth');
        return successResponse(null, 'Password changed successfully');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update user';
        logger.error(message, 'auth');
        return errorResponse(message, 500);
    }
}

// GET /api/auth - List all users
export async function GET() {
    try {
        const db = getDb();
        const users = db.prepare(
            'SELECT id, username, full_name, role, permissions, active, created_at FROM users ORDER BY id ASC'
        ).all();

        const parsed = (users as Record<string, unknown>[]).map(u => {
            let perms = {};
            try { perms = JSON.parse(u.permissions as string || '{}'); } catch { /* ignore */ }
            return { ...u, permissions: perms };
        });

        return successResponse({ users: parsed });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch users';
        return errorResponse(message, 500);
    }
}

// DELETE /api/auth - Delete user
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return errorResponse('User ID required', 400);

        const db = getDb();
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(Number(id)) as { role: string } | undefined;
        if (!user) return errorResponse('User not found', 404);
        if (user.role === 'admin') {
            const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number };
            if (adminCount.c <= 1) return errorResponse('Cannot delete the last admin', 400);
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(Number(id));
        return successResponse(null, 'User deleted');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete user';
        return errorResponse(message, 500);
    }
}
