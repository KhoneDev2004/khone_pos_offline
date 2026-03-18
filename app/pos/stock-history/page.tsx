'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import { ClipboardList, Calendar, Package, ArrowUpCircle, ArrowDownCircle, Search, X } from 'lucide-react';

interface LogEntry {
    id: number;
    level: string;
    message: string;
    module: string;
    timestamp: string;
}

type QuickFilter = 'today' | 'week' | 'month' | 'all';

export default function StockHistoryPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('today');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [search, setSearch] = useState('');

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
            case 'all':
                break;
        }
        return { from, to };
    }, []);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            let from = dateFrom, to = dateTo;
            if (!from && !to && quickFilter !== 'all') {
                const range = getDateRange(quickFilter);
                from = range.from; to = range.to;
            }
            
            // Fetch from multiple stock-related modules
            const modules = ['stock', 'import-api', 'products-api'];
            const allLogs: LogEntry[] = [];
            
            for (const mod of modules) {
                let url = `/api/logs?module=${mod}&limit=200`;
                if (from) url += `&from=${from}`;
                if (to) url += `&to=${to}`;

                const res = await fetch(url);
                const json = await res.json();
                if (json.status === 'success') allLogs.push(...json.data.logs);
            }
            
            // Sort by timestamp descending
            allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setLogs(allLogs);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    }, [quickFilter, dateFrom, dateTo, getDateRange]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleQuickFilter = (f: QuickFilter) => {
        setQuickFilter(f);
        setDateFrom('');
        setDateTo('');
    };

    // Parse log message to extract info
    const parseLog = (msg: string) => {
        // Import: "Excel import: 5 inserted, 2 updated, 0 skipped from "file.xlsx""
        if (msg.includes('import')) return { type: 'import' as const, icon: '📥' };
        // Stock restored from cancellation
        if (msg.includes('stock') && msg.includes('restored')) return { type: 'restore' as const, icon: '🔄' };
        // Stock updated
        if (msg.includes('stock') || msg.includes('Stock')) return { type: 'update' as const, icon: '📦' };
        // Product created/updated
        if (msg.includes('product') || msg.includes('Product')) return { type: 'product' as const, icon: '🏷️' };
        return { type: 'other' as const, icon: '📋' };
    };

    const filteredLogs = logs.filter(l => {
        if (!search) return true;
        return l.message.toLowerCase().includes(search.toLowerCase());
    });

    const quickFiltersArr: { key: QuickFilter; label: string }[] = [
        { key: 'today', label: 'ມື້ນີ້' },
        { key: 'week', label: 'ອາທິດນີ້' },
        { key: 'month', label: 'ເດືອນນີ້' },
        { key: 'all', label: 'ທັງໝົດ' },
    ];

    return (
        <POSPageWrapper title="ປະຫວັດສະຕ໊ອກ" icon={<ClipboardList size={20} />} onRefresh={fetchLogs}>

            {/* Summary */}
            <div className="hist-summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #4A6CF7, #3b5de7)' }}>
                        <ClipboardList size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ລາຍການທັງໝົດ</span>
                        <span className="hist-summary-value">{filteredLogs.length}</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <ArrowUpCircle size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ນຳເຂົ້າ</span>
                        <span className="hist-summary-value">{filteredLogs.filter(l => l.message.includes('import')).length}</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <ArrowDownCircle size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ອັບເດດ/ປ່ຽນແປງ</span>
                        <span className="hist-summary-value">{filteredLogs.filter(l => !l.message.includes('import')).length}</span>
                    </div>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="pos-page-filters">
                <div className="hist-quick-filters">
                    {quickFiltersArr.map(f => (
                        <button key={f.key} className={`hist-filter-btn sm ${quickFilter === f.key && !dateFrom ? 'active' : ''}`}
                            onClick={() => handleQuickFilter(f.key)}>
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="hist-date-range">
                    <Calendar size={14} />
                    <input type="date" className="hist-date-input" value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setQuickFilter('all'); }} />
                    <span>—</span>
                    <input type="date" className="hist-date-input" value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setQuickFilter('all'); }} />
                </div>
            </div>

            {/* Search */}
            <div className="pos-search-wrapper" style={{ maxWidth: 400, marginBottom: 16 }}>
                <Search size={18} className="pos-search-icon" />
                <input type="text" className="pos-search-input" placeholder="ຄົ້ນຫາ..."
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="pos-search-clear" onClick={() => setSearch('')}><X size={16} /></button>}
            </div>

            {/* Table */}
            <div className="pos-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 50 }}>#</th>
                            <th style={{ width: 50 }}>ປະເພດ</th>
                            <th>ລາຍລະອຽດ</th>
                            <th style={{ width: 80 }}>ລະດັບ</th>
                            <th style={{ width: 160 }}>ວັນທີ / ເວລາ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ກຳລັງໂຫຼດ...</td></tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                                ບໍ່ມີປະຫວັດສະຕ໊ອກ
                            </td></tr>
                        ) : (
                            filteredLogs.map((log, i) => {
                                const parsed = parseLog(log.message);
                                return (
                                    <tr key={log.id}>
                                        <td>{i + 1}</td>
                                        <td style={{ fontSize: 20, textAlign: 'center' }}>{parsed.icon}</td>
                                        <td>
                                            <div style={{ fontSize: 13 }}>{log.message}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${log.level === 'error' ? 'badge-danger' : log.level === 'warn' ? 'badge-warning' : 'badge-info'}`}>
                                                {log.level}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="hist-date-cell">
                                                <span className="hist-date">{new Date(log.timestamp).toLocaleDateString('lo-LA')}</span>
                                                <span className="hist-time">{new Date(log.timestamp).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </POSPageWrapper>
    );
}
