/**
 * Sync Worker — Background process to sync local orders to Supabase
 * 
 * Can be run as a standalone script or called from Electron main process.
 * Pushes unsynced orders from SQLite to Supabase cloud database.
 */

import { getDb } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import logger from '../lib/logger';

interface SyncResult {
    synced: number;
    failed: number;
    errors: string[];
}

async function syncOrders(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: 0, errors: [] };

    if (!isSupabaseConfigured()) {
        logger.warn('Supabase not configured — skipping sync', 'sync-worker');
        return result;
    }

    const db = getDb();

    // Get unsynced orders (batch of 50)
    const unsyncedOrders = db.prepare(
        'SELECT * FROM orders WHERE synced = 0 ORDER BY created_at ASC LIMIT 50'
    ).all() as Record<string, unknown>[];

    if (unsyncedOrders.length === 0) {
        logger.debug('No unsynced orders found', 'sync-worker');
        return result;
    }

    logger.info(`Starting sync: ${unsyncedOrders.length} orders to sync`, 'sync-worker');

    for (const order of unsyncedOrders) {
        try {
            // Get order items
            const items = db.prepare(
                'SELECT * FROM order_items WHERE order_id = ?'
            ).all(order.id as number) as Record<string, unknown>[];

            // Upsert order to Supabase
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
                result.failed++;
                result.errors.push(`Order #${order.id}: ${orderError.message}`);
                continue;
            }

            // Upsert order items
            if (items.length > 0) {
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
                    result.failed++;
                    result.errors.push(`Order #${order.id} items: ${itemsError.message}`);
                    continue;
                }
            }

            // Mark synced locally
            db.prepare('UPDATE orders SET synced = 1 WHERE id = ?').run(order.id);
            result.synced++;
        } catch (err) {
            result.failed++;
            const msg = err instanceof Error ? err.message : 'Unknown error';
            result.errors.push(`Order #${order.id}: ${msg}`);
        }
    }

    logger.info(
        `Sync complete: ${result.synced} synced, ${result.failed} failed`,
        'sync-worker'
    );

    return result;
}

// Sync products to Supabase
async function syncProducts(): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const db = getDb();
    const products = db.prepare('SELECT * FROM products').all() as Record<string, unknown>[];

    if (products.length === 0) return;

    // Batch upsert products
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        const { error } = await supabase.from('products').upsert(
            batch.map((p) => ({
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                price: p.price,
                stock: p.stock,
                category: p.category,
                created_at: p.created_at,
            }))
        );

        if (error) {
            logger.error(`Product sync batch error: ${error.message}`, 'sync-worker');
        }
    }

    logger.info(`Synced ${products.length} products to cloud`, 'sync-worker');
}

// Run sync cycle
async function runSync(): Promise<void> {
    try {
        await syncOrders();
        await syncProducts();
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sync cycle failed';
        logger.error(msg, 'sync-worker');
    }
}

// Auto-sync interval (every 5 minutes)
export function startAutoSync(intervalMs: number = 5 * 60 * 1000): ReturnType<typeof setInterval> {
    logger.info(`Auto-sync started (every ${intervalMs / 1000}s)`, 'sync-worker');

    // Run immediately
    runSync();

    // Then run periodically
    return setInterval(runSync, intervalMs);
}

export { syncOrders, syncProducts, runSync };
export default runSync;
