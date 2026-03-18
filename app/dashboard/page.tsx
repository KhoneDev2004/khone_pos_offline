'use client';

import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    ShoppingBag,
    Package,
    TrendingUp,
    RefreshCw,
} from 'lucide-react';
import SalesChart from '@/app/components/SalesChart';

interface Stats {
    todayRevenue: number;
    todayOrders: number;
    totalProducts: number;
    unsyncedOrders: number;
}

interface RecentOrder {
    id: number;
    total: number;
    payment_method: string;
    created_at: string;
    synced: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({
        todayRevenue: 0,
        todayOrders: 0,
        totalProducts: 0,
        unsyncedOrders: 0,
    });
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [chartData, setChartData] = useState<{ date: string; revenue: number; orders: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch orders
            const ordersRes = await fetch('/api/orders?limit=10');
            const ordersJson = await ordersRes.json();
            const orders = ordersJson.status === 'success' ? ordersJson.data.orders : [];
            setRecentOrders(orders);

            // Fetch products count
            const productsRes = await fetch('/api/products?limit=1');
            const productsJson = await productsRes.json();
            const totalProducts = productsJson.status === 'success' ? productsJson.data.pagination.total : 0;

            // Fetch sync status
            const syncRes = await fetch('/api/sync');
            const syncJson = await syncRes.json();
            const unsyncedOrders = syncJson.status === 'success' ? syncJson.data.unsynced : 0;

            // Calculate today's stats
            const today = new Date().toISOString().split('T')[0];
            const todayOrders = orders.filter((o: RecentOrder) =>
                o.created_at && o.created_at.startsWith(today)
            );
            const todayRevenue = todayOrders.reduce((sum: number, o: RecentOrder) => sum + o.total, 0);

            setStats({
                todayRevenue,
                todayOrders: todayOrders.length,
                totalProducts,
                unsyncedOrders,
            });

            // Generate chart data from recent 7 days
            const chartDays: { date: string; revenue: number; orders: number }[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayOrders = orders.filter((o: RecentOrder) =>
                    o.created_at && o.created_at.startsWith(dateStr)
                );
                chartDays.push({
                    date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                    revenue: dayOrders.reduce((sum: number, o: RecentOrder) => sum + o.total, 0),
                    orders: dayOrders.length,
                });
            }
            setChartData(chartDays);
        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    return (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <h1>📊 Dashboard</h1>
                <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-card-label">
                        <DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Today&apos;s Revenue
                    </div>
                    <div className="stat-card-value" style={{ color: 'var(--accent-secondary)' }}>
                        ₭{stats.todayRevenue.toLocaleString()}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-label">
                        <ShoppingBag size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Today&apos;s Orders
                    </div>
                    <div className="stat-card-value">{stats.todayOrders}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-label">
                        <Package size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Total Products
                    </div>
                    <div className="stat-card-value">{stats.totalProducts}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-label">
                        <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Pending Sync
                    </div>
                    <div className="stat-card-value" style={{ color: stats.unsyncedOrders > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                        {stats.unsyncedOrders}
                    </div>
                </div>
            </div>

            {/* Sales Chart */}
            <SalesChart data={chartData} />

            {/* Recent Orders */}
            <div className="chart-card">
                <div className="chart-title">Recent Orders</div>
                {loading ? (
                    <div className="empty-state"><div className="empty-state-text">Loading...</div></div>
                ) : recentOrders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🛒</div>
                        <div className="empty-state-text">No orders yet</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Total</th>
                                    <th>Payment</th>
                                    <th>Date</th>
                                    <th>Sync</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>
                                            ₭{order.total.toLocaleString()}
                                        </td>
                                        <td>{order.payment_method}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>
                                            {new Date(order.created_at).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${order.synced ? 'badge-success' : 'badge-warning'}`}>
                                                {order.synced ? 'Synced' : 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
