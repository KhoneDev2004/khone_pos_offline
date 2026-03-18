'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import {
    History, Eye, ChevronLeft, ChevronRight, Printer, FileSpreadsheet,
    Calendar, Banknote, CreditCard, User, Clock, Receipt, Search, X,
    Filter, Download, ArrowUpDown, Ban, FileWarning
} from 'lucide-react';
import Link from 'next/link';

import { printReceipt } from '@/lib/printReceipt';

interface OrderItem {
    id: number; product_name: string; quantity: number; price: number; subtotal: number;
}
interface Order {
    id: number; invoice_number: string; total: number; payment_method: string;
    amount_paid: number; change_amount: number; cashier: string;
    created_at: string; items?: OrderItem[];
}

type QuickFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export default function HistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('today');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [printingId, setPrintingId] = useState<number | null>(null);
    const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const limit = 20;

    // Summary stats
    const [summary, setSummary] = useState({ totalRevenue: 0, cashTotal: 0, transferTotal: 0, orderCount: 0 });

    // Helper: format Date as YYYY-MM-DD using LOCAL timezone (avoid toISOString which converts to UTC)
    const toLocalDateStr = useCallback((d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, []);

    const getDateRange = useCallback((filter: QuickFilter) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        let from = '', to = '';

        switch (filter) {
            case 'today':
                from = toLocalDateStr(today);
                to = toLocalDateStr(tomorrow);
                break;
            case 'week': {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                from = toLocalDateStr(startOfWeek);
                to = toLocalDateStr(tomorrow);
                break;
            }
            case 'month':
                from = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
                to = toLocalDateStr(tomorrow);
                break;
            case 'year':
                from = toLocalDateStr(new Date(now.getFullYear(), 0, 1));
                to = toLocalDateStr(tomorrow);
                break;
            case 'all':
                break;
        }
        return { from, to };
    }, [toLocalDateStr]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            let fromDate = dateFrom;
            let toDate = dateTo;

            if (quickFilter !== 'all' && !dateFrom && !dateTo) {
                const range = getDateRange(quickFilter);
                fromDate = range.from;
                toDate = range.to;
            }

            let url = `/api/orders?page=${page}&limit=${limit}`;
            if (fromDate) url += `&from=${fromDate}`;
            if (toDate) url += `&to=${toDate}`;

            const res = await fetch(url);
            const json = await res.json();
            if (json.status === 'success') {
                let filteredOrders = json.data.orders as Order[];

                // Client-side payment filter
                if (paymentFilter !== 'all') {
                    filteredOrders = filteredOrders.filter(o => o.payment_method === paymentFilter);
                }

                // Client-side search
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    filteredOrders = filteredOrders.filter(o =>
                        (o.invoice_number || '').toLowerCase().includes(term) ||
                        (o.cashier || '').toLowerCase().includes(term) ||
                        String(o.id).includes(term) ||
                        o.items?.some(item => item.product_name.toLowerCase().includes(term))
                    );
                }

                // Sort
                if (sortOrder === 'asc') {
                    filteredOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                }

                setOrders(filteredOrders);
                setTotal(json.data.pagination.total);
                setTotalPages(json.data.pagination.totalPages);

                // Calculate summary
                const allOrders = json.data.orders as Order[];
                setSummary({
                    totalRevenue: allOrders.reduce((sum: number, o: Order) => sum + o.total, 0),
                    cashTotal: allOrders.filter((o: Order) => o.payment_method === 'cash').reduce((sum: number, o: Order) => sum + o.total, 0),
                    transferTotal: allOrders.filter((o: Order) => o.payment_method === 'transfer').reduce((sum: number, o: Order) => sum + o.total, 0),
                    orderCount: allOrders.length,
                });
            }
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    }, [page, dateFrom, dateTo, quickFilter, paymentFilter, searchTerm, sortOrder, getDateRange]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleQuickFilter = (f: QuickFilter) => {
        setQuickFilter(f);
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const handleCustomDate = (from: string, to: string) => {
        setDateFrom(from);
        setDateTo(to);
        setQuickFilter('all');
        setPage(1);
    };

    // Print receipt
    const handlePrintReceipt = (order: Order) => {
        setPrintingId(order.id);
        printReceipt(order as any, () => {
            setPrintingId(null);
        });
    };

    // Export to Excel
    const exportExcel = async () => {
        try {
            const XLSX = await import('xlsx');
            const exportData = orders.map(o => ({
                'ເລກທີ່ໃບບິນ': o.invoice_number || `#${o.id}`,
                'ວັນທີ': new Date(o.created_at).toLocaleString('lo-LA'),
                'ພະນັກງານ': o.cashier || '-',
                'ວິທີຊຳລະ': o.payment_method === 'cash' ? 'ເງິນສົດ' : 'ເງິນໂອນ',
                'ຍອດລວມ': o.total,
                'ຮັບມາ': o.amount_paid,
                'ເງິນທອນ': o.change_amount,
                'ສິນຄ້າ': (o.items || []).map(i => `${i.product_name} x${i.quantity}`).join(', '),
            }));
            const ws = XLSX.utils.json_to_sheet(exportData);
            ws['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 40 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sales History');
            const filterLabel = quickFilter === 'today' ? 'ມື້ນີ້' : quickFilter === 'week' ? 'ອາທິດ' : quickFilter === 'month' ? 'ເດືອນ' : 'ທັງໝົດ';
            XLSX.writeFile(wb, `ປະຫວັດການຂາຍ_${filterLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Export Excel ສຳເລັດ');
        } catch { toast.error('Export ລົ້ມເຫຼວ'); }
    };

    // Cancel order handler
    const handleCancel = async () => {
        if (!cancelOrder) return;
        setCancelling(true);
        try {
            const res = await fetch(`/api/orders?id=${cancelOrder.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: cancelReason, cancelled_by: 'admin' }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success(`ຍົກເລີກບິນ ${cancelOrder.invoice_number || '#' + cancelOrder.id} ສຳເລັດ`);
                setCancelOrder(null);
                setCancelReason('');
                fetchOrders();
            } else toast.error(json.message);
        } catch { toast.error('ຍົກເລີກລົ້ມເຫຼວ'); }
        setCancelling(false);
    };

    const quickFilters: { key: QuickFilter; label: string; icon: React.ReactNode }[] = [
        { key: 'today', label: 'ມື້ນີ້', icon: <Clock size={14} /> },
        { key: 'week', label: 'ອາທິດນີ້', icon: <Calendar size={14} /> },
        { key: 'month', label: 'ເດືອນນີ້', icon: <Calendar size={14} /> },
        { key: 'year', label: 'ປີນີ້', icon: <Calendar size={14} /> },
        { key: 'all', label: 'ທັງໝົດ', icon: <History size={14} /> },
    ];

    return (
        <POSPageWrapper title="ປະຫວັດການຂາຍ" icon={<History size={20} />} onRefresh={fetchOrders}
            actions={
                <div className="flex gap-2">
                    <Link href="/pos/cancelled-orders" className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                        <FileWarning size={14} /> ປະຫວັດການຍົກເລີກ
                    </Link>
                    <button className="btn btn-sm btn-success" onClick={exportExcel}>
                        <FileSpreadsheet size={14} /> Export Excel
                    </button>
                </div>
            }>

            {/* Summary Cards */}
            <div className="hist-summary">
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #4A6CF7, #6366f1)' }}>
                        <Receipt size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ຍອດລວມ</span>
                        <span className="hist-summary-value">{summary.totalRevenue.toLocaleString()} ກີບ</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <Banknote size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ເງິນສົດ</span>
                        <span className="hist-summary-value">{summary.cashTotal.toLocaleString()} ກີບ</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
                        <CreditCard size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ໂອນ</span>
                        <span className="hist-summary-value">{summary.transferTotal.toLocaleString()} ກີບ</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <FileSpreadsheet size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ຈຳນວນບິນ</span>
                        <span className="hist-summary-value">{summary.orderCount}</span>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="hist-filters">
                {/* Quick Date Filters */}
                <div className="hist-quick-filters">
                    {quickFilters.map(f => (
                        <button
                            key={f.key}
                            className={`hist-filter-btn ${quickFilter === f.key && !dateFrom ? 'active' : ''}`}
                            onClick={() => handleQuickFilter(f.key)}
                        >
                            {f.icon} {f.label}
                        </button>
                    ))}
                </div>

                {/* Payment Filter */}
                <div className="hist-payment-filters">
                    <Filter size={14} />
                    <button className={`hist-filter-btn sm ${paymentFilter === 'all' ? 'active' : ''}`} onClick={() => setPaymentFilter('all')}>ທັງໝົດ</button>
                    <button className={`hist-filter-btn sm ${paymentFilter === 'cash' ? 'active' : ''}`} onClick={() => setPaymentFilter('cash')}>
                        <Banknote size={12} /> ເງິນສົດ
                    </button>
                    <button className={`hist-filter-btn sm ${paymentFilter === 'transfer' ? 'active' : ''}`} onClick={() => setPaymentFilter('transfer')}>
                        <CreditCard size={12} /> ໂອນ
                    </button>
                </div>

                {/* Custom Date Range */}
                <div className="hist-date-range">
                    <Calendar size={14} />
                    <input type="date" value={dateFrom} onChange={(e) => handleCustomDate(e.target.value, dateTo)} className="hist-date-input" />
                    <span>—</span>
                    <input type="date" value={dateTo} onChange={(e) => handleCustomDate(dateFrom, e.target.value)} className="hist-date-input" />
                </div>

                {/* Search */}
                <div className="hist-search">
                    <Search size={14} />
                    <input type="text" placeholder="ຄົ້ນຫາ ເລກບິນ, ພະນັກງານ, ສິນຄ້າ..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} className="hist-search-input" />
                    {searchTerm && <button className="hist-search-clear" onClick={() => setSearchTerm('')}><X size={14} /></button>}
                </div>
            </div>

            {/* Orders Table */}
            <div className="pos-table-wrapper">
                <table className="data-table hist-table">
                    <thead>
                        <tr>
                            <th>ເລກບິນ</th>
                            <th>
                                <button className="hist-sort-btn" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                                    ວັນທີ <ArrowUpDown size={12} />
                                </button>
                            </th>
                            <th>ພະນັກງານ</th>
                            <th>ວິທີຊຳລະ</th>
                            <th>ຍອດລວມ</th>
                            <th>ຮັບມາ</th>
                            <th>ເງິນທອນ</th>
                            <th>ຈັດການ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <div className="hist-loading">ກຳລັງໂຫຼດ...</div>
                            </td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>ບໍ່ມີຂໍ້ມູນ
                            </td></tr>
                        ) : (
                            orders.map((order) => (
                                <React.Fragment key={order.id}>
                                    <tr className={expandedId === order.id ? 'hist-row-expanded' : ''}>
                                        <td>
                                            <span className="hist-invoice-badge">
                                                {order.invoice_number || `#${order.id}`}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="hist-date-cell">
                                                <span className="hist-date">{new Date(order.created_at).toLocaleDateString('lo-LA')}</span>
                                                <span className="hist-time">{new Date(order.created_at).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="hist-cashier">
                                                <User size={14} />
                                                <span>{order.cashier || '-'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`hist-payment-badge ${order.payment_method}`}>
                                                {order.payment_method === 'cash' ? (
                                                    <><Banknote size={12} /> ເງິນສົດ</>
                                                ) : (
                                                    <><CreditCard size={12} /> ໂອນ</>
                                                )}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#4fc3f7' }}>{order.total.toLocaleString()} ກີບ</td>
                                        <td>{order.amount_paid.toLocaleString()}</td>
                                        <td>{order.change_amount.toLocaleString()}</td>
                                        <td>
                                            <div className="hist-actions">
                                                <button className="btn btn-sm btn-secondary" title="ເບິ່ງລາຍລະອຽດ"
                                                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                                                    <Eye size={14} />
                                                </button>
                                                <button className="btn btn-sm btn-success" title="ປີ້ນໃບບິນ"
                                                    onClick={() => handlePrintReceipt(order)} disabled={printingId === order.id}>
                                                    <Printer size={14} />
                                                </button>
                                                <button className="btn btn-sm btn-danger" title="ຍົກເລີກບິນ"
                                                    onClick={() => { setCancelOrder(order); setCancelReason(''); }}>
                                                    <Ban size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === order.id && order.items && (
                                        <tr className="hist-detail-row">
                                            <td colSpan={8}>
                                                <div className="hist-detail-card">
                                                    <div className="hist-detail-header">
                                                        <h4>📦 ລາຍການສິນຄ້າ — {order.invoice_number || `#${order.id}`}</h4>
                                                        <div className="hist-detail-meta">
                                                            <span><User size={12} /> {order.cashier || '-'}</span>
                                                            <span><Clock size={12} /> {new Date(order.created_at).toLocaleString('lo-LA')}</span>
                                                            <span className={`hist-payment-badge sm ${order.payment_method}`}>
                                                                {order.payment_method === 'cash' ? 'ເງິນສົດ' : 'ໂອນ'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <table className="data-table hist-items-table">
                                                        <thead>
                                                            <tr><th>#</th><th>ສິນຄ້າ</th><th>ຈຳນວນ</th><th>ລາຄາ</th><th>ລວມ</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {order.items.map((item, idx) => (
                                                                <tr key={item.id}>
                                                                    <td>{idx + 1}</td>
                                                                    <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                                                                    <td>{item.quantity}</td>
                                                                    <td>{item.price.toLocaleString()}</td>
                                                                    <td style={{ fontWeight: 700, color: '#4fc3f7' }}>{item.subtotal.toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr>
                                                                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>ລວມທັງໝົດ:</td>
                                                                <td style={{ fontWeight: 700, color: '#22c55e', fontSize: 16 }}>{order.total.toLocaleString()} ກີບ</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                    <div className="hist-detail-footer">
                                                        <button className="btn btn-sm btn-success" onClick={() => handlePrintReceipt(order)}>
                                                            <Printer size={14} /> ປິ້ນໃບບິນ
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pos-pagination">
                    <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft size={14} /> ກ່ອນ
                    </button>
                    <div className="hist-page-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const p = page <= 3 ? i + 1 : page + i - 2;
                            if (p < 1 || p > totalPages) return null;
                            return (
                                <button key={p} className={`hist-page-btn ${p === page ? 'active' : ''}`}
                                    onClick={() => setPage(p)}>
                                    {p}
                                </button>
                            );
                        })}
                    </div>
                    <span className="pos-page-info">ໜ້າ {page} / {totalPages} ({total} ລາຍການ)</span>
                    <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        ຕໍ່ໄປ <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* Cancel Modal */}
            {cancelOrder && (
                <div className="modal-overlay" onClick={() => !cancelling && setCancelOrder(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <h2 className="modal-title" style={{ color: '#ef4444' }}>🚫 ຍົກເລີກໃບບິນ</h2>
                        <div style={{
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 10, padding: 14, marginBottom: 16
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontWeight: 700 }}>{cancelOrder.invoice_number || `#${cancelOrder.id}`}</span>
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>{cancelOrder.total.toLocaleString()} ກີບ</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                📅 {new Date(cancelOrder.created_at).toLocaleString('lo-LA')} • 👤 {cancelOrder.cashier || '-'}
                            </div>
                            {cancelOrder.items && cancelOrder.items.length > 0 && (
                                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {cancelOrder.items.map(item => (
                                        <div key={item.id}>{item.product_name} ×{item.quantity} = {item.subtotal.toLocaleString()}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ color: '#ef4444' }}>📝 ເຫດຜົນການຍົກເລີກ *</label>
                            <textarea className="form-input" rows={3} value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="ເຊັ່ນ: ລູກຄ້າປ່ຽນໃຈ, ສິນຄ້າຜິດ, ຄິດໄລ່ຜິດ..."
                                style={{ resize: 'vertical' }} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
                            ⚠️ ການຍົກເລີກຈະ:<br />
                            • ຄືນສະຕ໊ອກສິນຄ້າກັບ<br />
                            • ລຶບບິນອອກຈາກປະຫວັດ<br />
                            • ບັນທຶກປະຫວັດການຍົກເລີກໄວ້
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setCancelOrder(null)} disabled={cancelling}>ປິດ</button>
                            <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? 'ກຳລັງຍົກເລີກ...' : '🚫 ຢືນຢັນຍົກເລີກ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </POSPageWrapper>
    );
}
