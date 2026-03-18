import { getDb } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase'; 
import { successResponse, errorResponse } from '@/lib/apiResponse';
import logger from '@/lib/logger';

// POST /api/sync - Sync unsynced orders to Supabase
export async function POST() {
    try {
        if (!isSupabaseConfigured()) {
            return errorResponse('Supabase is not configured. Set SUPABASE_URL and SERVICE_ROLE_KEY in .env.local', 400);
        }

        const db = getDb();

        // Get unsynced orders
        const unsyncedOrders = db.prepare(
            'SELECT * FROM orders WHERE synced = 0 ORDER BY created_at ASC LIMIT 100'
        ).all() as Record<string, unknown>[];

        if (unsyncedOrders.length === 0) {
            return successResponse({ synced: 0 }, 'No orders to sync');
        }

        let syncedCount = 0;
        const errors: string[] = [];

        for (const order of unsyncedOrders) {
            try {
                const items = db.prepare(
                    'SELECT * FROM order_items WHERE order_id = ?'
                ).all(order.id as number) as Record<string, unknown>[];

                // อัปโหลดข้อมูล Order ขึ้น Supabase
                const { error: orderError } = await supabase
                    .from('orders')
                    .upsert({
                        id: order.id,
                        total: order.total,
                        payment_method: order.payment_method,
                        amount_paid: order.amount_paid,
                        change_amount: order.change_amount,
                        cashier: order.cashier,
                        created_at: order.created_at,
                    });

                if (orderError) {
                    console.error(`❌ [Sync Error - Order ${order.id}]:`, orderError.message);
                    errors.push(`Order ${order.id}: ${orderError.message}`);
                    continue;
                }

                if (items.length > 0) {
                    // อัปโหลดข้อมูล Order Items ขึ้น Supabase
                    const { error: itemsError } = await supabase
                        .from('order_items')
                        .upsert(
                            items.map((item) => ({
                                id: item.id,
                                order_id: item.order_id,
                                product_id: item.product_id,
                                product_name: item.product_name,
                                quantity: item.quantity,
                                price: item.price,
                                subtotal: item.subtotal,
                            }))
                        );

                    if (itemsError) {
                        console.error(`❌ [Sync Error - Items for Order ${order.id}]:`, itemsError.message);
                        errors.push(`Order ${order.id} items: ${itemsError.message}`);
                        continue;
                    }
                }

                // Mark as synced in local DB
                db.prepare('UPDATE orders SET synced = 1 WHERE id = ?').run(order.id);
                syncedCount++;
                console.log(`✅ [Sync Success] Order ${order.id} synced to Supabase!`);

            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown sync error';
                console.error(`❌ [Sync Catch Error - Order ${order.id}]:`, msg);
                errors.push(`Order ${order.id}: ${msg}`);
            }
        }

        logger.info(`Sync completed: ${syncedCount}/${unsyncedOrders.length} orders synced`, 'sync-api');

        return successResponse(
            { synced: syncedCount, total: unsyncedOrders.length, errors: errors.slice(0, 10) },
            `Synced ${syncedCount} of ${unsyncedOrders.length} orders`
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        logger.error(message, 'sync-api');
        return errorResponse(message, 500);
    }
}

// GET /api/sync - Get sync status (ปล่อยเหมือนเดิมได้ครับ)
export async function GET() {
    try {
        const db = getDb();
        const unsynced = db.prepare('SELECT COUNT(*) as count FROM orders WHERE synced = 0').get() as { count: number };
        const total = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };

        return successResponse({
            unsynced: unsynced.count,
            total: total.count,
            supabaseConfigured: isSupabaseConfigured(),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get sync status';
        logger.error(message, 'sync-api');
        return errorResponse(message, 500);
    }
}