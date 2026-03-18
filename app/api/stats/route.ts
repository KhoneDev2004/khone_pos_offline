import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// GET /api/stats — Get dashboard statistics with optional date filtering
export async function GET(req: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(req.url);
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');

        const today = new Date().toISOString().split('T')[0];

        // Build date filter clause
        let dateClause = '';
        const dateParams: string[] = [];
        if (dateFrom && dateTo) {
            dateClause = ' AND created_at BETWEEN ? AND ?';
            dateParams.push(dateFrom, dateTo + ' 23:59:59');
        } else if (dateFrom) {
            dateClause = ' AND created_at >= ?';
            dateParams.push(dateFrom);
        } else if (dateTo) {
            dateClause = ' AND created_at <= ?';
            dateParams.push(dateTo + ' 23:59:59');
        }

        // Today stats (always based on today, ignoring date filter)
        const todayOrders = db.prepare(
            "SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM orders WHERE created_at >= ?"
        ).get(today) as { count: number; revenue: number };

        // Product stats
        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
        const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= 10 AND stock > 0').get() as { count: number };
        const outOfStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= 0').get() as { count: number };

        // Overall order stats (with date filter)
        const totalOrders = db.prepare(
            `SELECT COUNT(*) as count FROM orders WHERE 1=1${dateClause}`
        ).get(...dateParams) as { count: number };
        const totalRevenue = db.prepare(
            `SELECT COALESCE(SUM(total),0) as total FROM orders WHERE 1=1${dateClause}`
        ).get(...dateParams) as { total: number };
        const unsynced = db.prepare('SELECT COUNT(*) as count FROM orders WHERE synced = 0').get() as { count: number };

        // Payment method breakdown (with date filter)
        const paymentBreakdown = db.prepare(`
            SELECT 
                payment_method,
                COUNT(*) as order_count,
                COALESCE(SUM(total), 0) as total_revenue
            FROM orders 
            WHERE 1=1${dateClause}
            GROUP BY payment_method
        `).all(...dateParams) as { payment_method: string; order_count: number; total_revenue: number }[];

        // Daily revenue (with date filter, fallback to last 7 days)
        let dailyRevenueQuery = `
            SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
            FROM orders WHERE 1=1`;
        const dailyParams: string[] = [];
        
        if (dateFrom || dateTo) {
            dailyRevenueQuery += dateClause;
            dailyParams.push(...dateParams);
        } else {
            dailyRevenueQuery += ` AND created_at >= DATE('now', '-7 days')`;
        }
        dailyRevenueQuery += ` GROUP BY DATE(created_at) ORDER BY date ASC`;
        const dailyRevenue = db.prepare(dailyRevenueQuery).all(...dailyParams);

        // Top 10 products by quantity sold (with date filter)
        let topProductsQuery = `
            SELECT oi.product_name as name, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as total_revenue
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE 1=1`;
        const topParams: string[] = [];
        
        if (dateFrom && dateTo) {
            topProductsQuery += ' AND o.created_at BETWEEN ? AND ?';
            topParams.push(dateFrom, dateTo + ' 23:59:59');
        } else if (dateFrom) {
            topProductsQuery += ' AND o.created_at >= ?';
            topParams.push(dateFrom);
        } else if (dateTo) {
            topProductsQuery += ' AND o.created_at <= ?';
            topParams.push(dateTo + ' 23:59:59');
        }
        topProductsQuery += ` GROUP BY oi.product_id ORDER BY total_sold DESC LIMIT 10`;
        const topProducts = db.prepare(topProductsQuery).all(...topParams);

        // Hourly breakdown for today
        const hourlyRevenue = db.prepare(`
            SELECT 
                CAST(strftime('%H', created_at) AS INTEGER) as hour,
                COUNT(*) as orders,
                COALESCE(SUM(total), 0) as revenue
            FROM orders 
            WHERE DATE(created_at) = ?
            GROUP BY strftime('%H', created_at)
            ORDER BY hour ASC
        `).all(today) as { hour: number; orders: number; revenue: number }[];

        // Average order value (with date filter)
        const avgOrder = db.prepare(
            `SELECT COALESCE(AVG(total), 0) as avg_total FROM orders WHERE 1=1${dateClause}`
        ).get(...dateParams) as { avg_total: number };

        // Total products sold today
        const todayProductsSold = db.prepare(`
            SELECT COALESCE(SUM(oi.quantity), 0) as total_sold
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE DATE(o.created_at) = ?
        `).get(today) as { total_sold: number };

        return successResponse({
            today: { 
                orders: todayOrders.count, 
                revenue: todayOrders.revenue,
                productsSold: todayProductsSold.total_sold,
                avgOrderValue: Math.round(avgOrder.avg_total),
            },
            products: { total: totalProducts.count, lowStock: lowStock.count, outOfStock: outOfStock.count },
            orders: { total: totalOrders.count, unsynced: unsynced.count },
            revenue: { total: totalRevenue.total },
            paymentBreakdown,
            dailyRevenue,
            topProducts,
            hourlyRevenue,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get stats';
        return errorResponse(message, 500);
    }
}
