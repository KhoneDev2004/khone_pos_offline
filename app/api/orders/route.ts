import { NextRequest } from 'next/server';
import { getDb, runTransaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';

interface OrderItem {
    product_id: number;
    quantity: number;
    price: number;
}

// GET /api/orders - List orders
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');

        const db = getDb();

        let query = 'SELECT * FROM orders';
        const queryParams: (string | number)[] = [];

        if (dateFrom && dateTo) {
            query += ' WHERE created_at BETWEEN ? AND ?';
            queryParams.push(dateFrom, dateTo);
        } else if (dateFrom) {
            query += ' WHERE created_at >= ?';
            queryParams.push(dateFrom);
        } else if (dateTo) {
            query += ' WHERE created_at <= ?';
            queryParams.push(dateTo);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        const orders = db.prepare(query).all(...queryParams);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM orders';
        const countParams: string[] = [];
        if (dateFrom && dateTo) {
            countQuery += ' WHERE created_at BETWEEN ? AND ?';
            countParams.push(dateFrom, dateTo);
        } else if (dateFrom) {
            countQuery += ' WHERE created_at >= ?';
            countParams.push(dateFrom);
        } else if (dateTo) {
            countQuery += ' WHERE created_at <= ?';
            countParams.push(dateTo);
        }

        const countResult = db.prepare(countQuery).get(...countParams) as { count: number };

        // Get items for each order
        const ordersWithItems = (orders as Record<string, unknown>[]).map((order) => {
            const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id as number);
            return { ...order, items };
        });

        return successResponse({
            orders: ordersWithItems,
            pagination: {
                page,
                limit,
                total: countResult.count,
                totalPages: Math.ceil(countResult.count / limit),
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch orders';
        logger.error(message, 'orders-api');
        return errorResponse(message, 500);
    }
}

// POST /api/orders - Create an order with items (transaction)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { items, payment_method, amount_paid, cashier } = body as {
            items: OrderItem[];
            payment_method?: string;
            amount_paid?: number;
            cashier?: string;
        };

        if (!items || items.length === 0) {
            return errorResponse('Order must have at least one item', 400);
        }

        const result = runTransaction((db) => {
            // Calculate total and validate stock
            let total = 0;
            const validatedItems: Array<OrderItem & { product_name: string; subtotal: number }> = [];

            for (const item of items) {
                const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as Record<string, unknown> | undefined;

                if (!product) {
                    throw new Error(`Product ID ${item.product_id} not found`);
                }

                if ((product.stock as number) < item.quantity) {
                    throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`);
                }

                const subtotal = item.price * item.quantity;
                total += subtotal;
                validatedItems.push({
                    ...item,
                    product_name: product.name as string,
                    subtotal,
                });
            }

            const changeAmount = (amount_paid || total) - total;

            // Generate local timestamp (YYYY-MM-DD HH:MM:SS) — use local time, not UTC
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const localDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const localTimestamp = `${localDateStr} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

            // Generate invoice number using local date
            const dateStr = localDateStr.replace(/-/g, '');
            const countToday = db.prepare(
                "SELECT COUNT(*) as c FROM orders WHERE DATE(created_at) = ?"
            ).get(localDateStr) as { c: number };
            const invoiceNumber = `INV-${dateStr}-${String(countToday.c + 1).padStart(3, '0')}`;

            // Create order with local timestamp
            const orderResult = db.prepare(
                'INSERT INTO orders (invoice_number, total, payment_method, amount_paid, change_amount, cashier, synced, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
            ).run(invoiceNumber, total, payment_method || 'cash', amount_paid || total, changeAmount, cashier || '', localTimestamp);

            const orderId = orderResult.lastInsertRowid;

            // Insert order items and update stock
            const insertItem = db.prepare(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)'
            );

            const updateStock = db.prepare(
                'UPDATE products SET stock = stock - ? WHERE id = ?'
            );

            for (const item of validatedItems) {
                insertItem.run(orderId, item.product_id, item.product_name, item.quantity, item.price, item.subtotal);
                updateStock.run(item.quantity, item.product_id);
            }

            const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
            const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

            return { ...order as Record<string, unknown>, items: orderItems };
        });

        logger.info(`Order created: ID ${(result as Record<string, unknown>).id}, Total: ${(result as Record<string, unknown>).total}`, 'orders-api');
        return successResponse(result, 'Order created successfully', 201);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create order';
        logger.error(message, 'orders-api');
        return errorResponse(message, 400);
    }
}

// DELETE /api/orders - Cancel/void an order
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get('id');
        if (!orderId) return errorResponse('Order ID is required', 400);

        const body = await req.json();
        const { reason, cancelled_by } = body as { reason?: string; cancelled_by?: string };

        const db = getDb();

        // Ensure cancelled_orders table exists
        db.exec(`CREATE TABLE IF NOT EXISTS cancelled_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            invoice_number TEXT,
            total REAL NOT NULL DEFAULT 0,
            payment_method TEXT DEFAULT 'cash',
            cashier TEXT DEFAULT '',
            reason TEXT DEFAULT '',
            cancelled_by TEXT DEFAULT '',
            items_snapshot TEXT DEFAULT '[]',
            original_date DATETIME,
            cancelled_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderId)) as Record<string, unknown> | undefined;
        if (!order) return errorResponse('Order not found', 404);

        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(Number(orderId));

        runTransaction((txDb) => {
            // Save to cancelled_orders log
            txDb.prepare(
                `INSERT INTO cancelled_orders (order_id, invoice_number, total, payment_method, cashier, reason, cancelled_by, items_snapshot, original_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
                order.id, order.invoice_number || '', order.total, order.payment_method,
                order.cashier, reason, cancelled_by || 'admin',
                JSON.stringify(items), order.created_at
            );

            // Restore stock for each item
            const restoreStock = txDb.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
            for (const item of items as Record<string, unknown>[]) {
                restoreStock.run(item.quantity, item.product_id);
            }

            // Delete order items and order
            txDb.prepare('DELETE FROM order_items WHERE order_id = ?').run(Number(orderId));
            txDb.prepare('DELETE FROM orders WHERE id = ?').run(Number(orderId));
        });

        logger.info(`Order cancelled: ${order.invoice_number}, Reason: ${reason}`, 'orders-api');
        return successResponse(null, 'ຍົກເລີກບິນສຳເລັດ');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel order';
        logger.error(message, 'orders-api');
        return errorResponse(message, 500);
    }
}
