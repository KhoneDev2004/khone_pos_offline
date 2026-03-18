'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import { FileWarning, Eye, Calendar, User, Banknote, Clock, Ban } from 'lucide-react';

interface CancelledOrder {
    id: number; order_id: number; invoice_number: string; total: number;
    payment_method: string; cashier: string; reason: string; cancelled_by: string;
    items_snapshot: string; original_date: string; cancelled_at: string;
}

type QuickFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export default function CancelledOrdersPage() {
    const [orders, setOrders] = useState<CancelledOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('today');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const getDateRange = useCallback((filter: QuickFilter) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let from = '', to = '';
        switch (filter) {
            case 'today':
                from = today.toISOString().split('T')[0];
                to = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
                break;
            case 'week': {
                const day = today.getDay();
                const monday = new Date(today.getTime() - ((day === 0 ? 6 : day - 1) * 86400000));
                from = monday.toISOString().split('T')[0];
                to = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
                break;
            }
            case 'month':
                from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                to = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
                break;
            case 'year':
                from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                to = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
                break;
            case 'all':
                break;
        }
        return { from, to };
    }, []);

    const fetchCancelled = useCallback(async () => {
        setLoading(true);
        try {
            let from = dateFrom, to = dateTo;
            if (!from && !to && quickFilter !== 'all') {
                const range = getDateRange(quickFilter);
                from = range.from; to = range.to;
            }
            let url = '/api/cancelled-orders';
            const params: string[] = [];
            if (from) params.push(`from=${from}`);
            if (to) params.push(`to=${to}`);
            if (params.length) url += '?' + params.join('&');

            const res = await fetch(url);
            const json = await res.json();
            if (json.status === 'success') setOrders(json.data.cancelled_orders);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    }, [quickFilter, dateFrom, dateTo, getDateRange]);

    useEffect(() => { fetchCancelled(); }, [fetchCancelled]);

    const handleQuickFilter = (f: QuickFilter) => {
        setQuickFilter(f);
        setDateFrom('');
        setDateTo('');
    };

    const parseItems = (snapshot: string) => {
        try { return JSON.parse(snapshot) as { product_name: string; quantity: number; price: number; subtotal: number }[]; }
        catch { return []; }
    };

    const totalCancelled = orders.reduce((sum, o) => sum + o.total, 0);

    const quickFilters: { key: QuickFilter; label: string }[] = [
        { key: 'today', label: 'ມື້ນີ້' },
        { key: 'week', label: 'ອາທິດນີ້' },
        { key: 'month', label: 'ເດືອນນີ້' },
        { key: 'year', label: 'ປີນີ້' },
        { key: 'all', label: 'ທັງໝົດ' },
    ];

    return (
        <POSPageWrapper title="ປະຫວັດການຍົກເລີກ" icon={<FileWarning size={20} />} onRefresh={fetchCancelled}>

            {/* Summary */}
            <div className="hist-summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                        <Ban size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ບິນຍົກເລີກ</span>
                        <span className="hist-summary-value">{orders.length}</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <Banknote size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ຍອດທີ່ຍົກເລີກ</span>
                        <span className="hist-summary-value">{totalCancelled.toLocaleString()} ກີບ</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <Clock size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ຍົກເລີກລ່າສຸດ</span>
                        <span className="hist-summary-value" style={{ fontSize: 13 }}>
                            {orders.length > 0 ? new Date(orders[0].cancelled_at).toLocaleDateString('lo-LA') : '-'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="pos-page-filters">
                <div className="hist-quick-filters">
                    {quickFilters.map(f => (
                        <button key={f.key} className={`hist-filter-btn sm ${quickFilter === f.key && !dateFrom ? 'active' : ''}`}
                            onClick={() => handleQuickFilter(f.key)}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Custom Date Range */}
                <div className="hist-date-range">
                    <Calendar size={14} />
                    <input type="date" className="hist-date-input" value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setQuickFilter('all'); }} />
                    <span>—</span>
                    <input type="date" className="hist-date-input" value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setQuickFilter('all'); }} />
                </div>
            </div>

            <div className="pos-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ເລກບິນ</th><th>ວັນທີ່ຂາຍ</th><th>ວັນທີ່ຍົກເລີກ</th>
                            <th>ພະນັກງານ</th><th>ຍອດ</th><th>ໝາຍເຫດ</th><th>ຜູ້ຍົກເລີກ</th><th>ລາຍລະອຽດ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ກຳລັງໂຫຼດ...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                                {quickFilter === 'today' ? 'ບໍ່ມີການຍົກເລີກມື້ນີ້' : 'ບໍ່ມີການຍົກເລີກ'}
                            </td></tr>
                        ) : (
                            orders.map((o) => (
                                <React.Fragment key={o.id}>
                                    <tr style={{ background: 'rgba(239,68,68,0.03)' }}>
                                        <td>
                                            <span className="hist-invoice-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                                                {o.invoice_number || `#${o.order_id}`}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="hist-date-cell">
                                                <span className="hist-date">{o.original_date ? new Date(o.original_date).toLocaleDateString('lo-LA') : '-'}</span>
                                                <span className="hist-time">{o.original_date ? new Date(o.original_date).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="hist-date-cell">
                                                <span className="hist-date" style={{ color: '#ef4444' }}>{new Date(o.cancelled_at).toLocaleDateString('lo-LA')}</span>
                                                <span className="hist-time">{new Date(o.cancelled_at).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="hist-cashier"><User size={14} /><span>{o.cashier || '-'}</span></div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#ef4444' }}>{o.total.toLocaleString()} ກີບ</td>
                                        <td>
                                            <div style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-secondary)' }} title={o.reason}>
                                                {o.reason ? `📝 ${o.reason}` : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="hist-cashier"><User size={14} /><span>{o.cancelled_by || '-'}</span></div>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedId === o.id && (
                                        <tr className="hist-detail-row"><td colSpan={8}>
                                            <div className="hist-detail-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                                                <div className="hist-detail-header">
                                                    <h4>📦 ສິນຄ້າທີ່ຍົກເລີກ — {o.invoice_number || `#${o.order_id}`}</h4>
                                                    <span style={{ fontSize: 12, color: '#22c55e' }}>✅ ສະຕ໊ອກໄດ້ຄືນແລ້ວ</span>
                                                </div>
                                                <table className="data-table hist-items-table">
                                                    <thead><tr><th>ສິນຄ້າ</th><th>ຈຳນວນ</th><th>ລາຄາ</th><th>ລວມ</th></tr></thead>
                                                    <tbody>
                                                        {parseItems(o.items_snapshot).map((item, i) => (
                                                            <tr key={i}>
                                                                <td>{item.product_name}</td>
                                                                <td>{item.quantity}</td>
                                                                <td>{item.price.toLocaleString()}</td>
                                                                <td>{item.subtotal.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot><tr>
                                                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>ລວມທັງໝົດ:</td>
                                                        <td style={{ fontWeight: 700, color: '#ef4444' }}>{o.total.toLocaleString()} ກີບ</td>
                                                    </tr></tfoot>
                                                </table>
                                                {o.reason && (
                                                    <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: '#f87171', marginTop: 8 }}>
                                                        <strong>ໝາຍເຫດ:</strong> {o.reason}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                                    ຍົກເລີກໂດຍ: {o.cancelled_by} — {new Date(o.cancelled_at).toLocaleString('lo-LA')}
                                                </div>
                                            </div>
                                        </td></tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </POSPageWrapper>
    );
}
