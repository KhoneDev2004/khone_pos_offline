'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface Order {
    id: number;
    total: number;
    payment_method: string;
    amount_paid: number;
    change_amount: number;
    cashier: string;
    created_at: string;
    synced: number;
    items: Array<{
        id: number;
        product_name: string;
        quantity: number;
        price: number;
        subtotal: number;
    }>;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders?page=${page}&limit=20`);
            const json = await res.json();
            if (json.status === 'success') {
                setOrders(json.data.orders);
                setTotalPages(json.data.pagination.totalPages);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    return (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <h1>🛒 Orders</h1>
                <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="empty-state"><div className="empty-state-text">Loading orders...</div></div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🛒</div>
                    <div className="empty-state-text">No orders found</div>
                </div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Total</th>
                                    <th>Paid</th>
                                    <th>Change</th>
                                    <th>Payment</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <React.Fragment key={order.id}>
                                        <tr
                                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td style={{ fontWeight: 600 }}>#{order.id}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
                                                ₭{order.total.toLocaleString()}
                                            </td>
                                            <td>₭{order.amount_paid.toLocaleString()}</td>
                                            <td>₭{order.change_amount.toLocaleString()}</td>
                                            <td>{order.payment_method}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                {new Date(order.created_at).toLocaleString()}
                                            </td>
                                            <td>
                                                <span className={`badge ${order.synced ? 'badge-success' : 'badge-warning'}`}>
                                                    {order.synced ? 'Synced' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedOrder === order.id && order.items && (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 0 }}>
                                                    <div style={{ padding: '12px 24px', background: 'var(--bg-elevated)' }}>
                                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                                                            ORDER ITEMS
                                                        </div>
                                                        {order.items.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className="flex justify-between"
                                                                style={{ padding: '6px 0', fontSize: 13, borderBottom: '1px solid var(--border-color)' }}
                                                            >
                                                                <span>{item.product_name} × {item.quantity}</span>
                                                                <span style={{ color: 'var(--accent-secondary)' }}>₭{item.subtotal.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
                        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
