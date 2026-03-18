'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import {
    BarChart3, TrendingUp, Package, ShoppingCart, DollarSign,
    AlertTriangle, Banknote, CreditCard, Calendar, Trophy,
    ArrowUpRight, ArrowDownRight, Clock, Filter, Wallet
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Stats {
    today: { orders: number; revenue: number; productsSold: number; avgOrderValue: number };
    products: { total: number; lowStock: number; outOfStock: number };
    orders: { total: number; unsynced: number };
    revenue: { total: number };
    paymentBreakdown: { payment_method: string; order_count: number; total_revenue: number }[];
    dailyRevenue: { date: string; orders: number; revenue: number }[];
    topProducts: { name: string; total_sold: number; total_revenue: number }[];
    hourlyRevenue: { hour: number; orders: number; revenue: number }[];
}

interface Order {
    id: number;
    total: number;
    payment_method: string;
    amount_paid: number;
    change_amount: number;
    cashier: string;
    created_at: string;
    items?: { id: number; product_name: string; quantity: number; price: number; subtotal: number }[];
}

const TABS = [
    { id: 'dashboard', label: 'ແດຊບອດ', icon: BarChart3, emoji: '📊' },
    { id: 'payments', label: 'ເງິນສົດ/ໂອນ', icon: Wallet, emoji: '💰' },
    { id: 'top-products', label: 'ສິນຄ້າຂາຍດີ', icon: Trophy, emoji: '🏆' },
    { id: 'revenue', label: 'ລາຍຮັບ', icon: TrendingUp, emoji: '📈' },
    { id: 'summary', label: 'ສະຫຼຸບ', icon: Package, emoji: '📋' },
];

const QUICK_FILTERS = [
    { id: 'today', label: 'ມື້ນີ້' },
    { id: 'week', label: 'ອາທິດນີ້' },
    { id: 'month', label: 'ເດືອນນີ້' },
    { id: 'all', label: 'ທັງໝົດ' },
];

const PAYMENT_COLORS: Record<string, string> = {
    cash: '#22c55e',
    transfer: '#6c5ce7',
    card: '#4fc3f7',
    other: '#fdcb6e',
};

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'ເງິນສົດ',
    transfer: 'ໂອນ',
    card: 'ບັດ',
};

const PIE_COLORS = ['#22c55e', '#6c5ce7', '#4fc3f7', '#fdcb6e', '#e17055'];

export default function ReportsPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [quickFilter, setQuickFilter] = useState('today');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('all');

    const getDateRange = useCallback((filter: string) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        switch (filter) {
            case 'today':
                return { from: todayStr, to: todayStr };
            case 'week': {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return { from: weekStart.toISOString().split('T')[0], to: todayStr };
            }
            case 'month': {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return { from: monthStart.toISOString().split('T')[0], to: todayStr };
            }
            default:
                return { from: '', to: '' };
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let from = dateFrom;
            let to = dateTo;
            if (!from && !to && quickFilter !== 'all') {
                const range = getDateRange(quickFilter);
                from = range.from;
                to = range.to;
            }

            const statsUrl = `/api/stats${from || to ? `?from=${from}&to=${to}` : ''}`;
            const ordersUrl = `/api/orders?limit=100${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`;

            const [statsRes, ordersRes] = await Promise.all([
                fetch(statsUrl),
                fetch(ordersUrl),
            ]);

            const [statsJson, ordersJson] = await Promise.all([
                statsRes.json(),
                ordersRes.json(),
            ]);

            if (statsJson.status === 'success') setStats(statsJson.data);
            if (ordersJson.status === 'success') setOrders(ordersJson.data.orders || []);
        } catch {
            toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ');
        }
        setLoading(false);
    }, [dateFrom, dateTo, quickFilter, getDateRange]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleQuickFilter = (id: string) => {
        setQuickFilter(id);
        setDateFrom('');
        setDateTo('');
    };

    const handleDateChange = (from: string, to: string) => {
        setDateFrom(from);
        setDateTo(to);
        setQuickFilter('all');
    };

    // Filter orders by payment method
    const filteredOrders = paymentFilter === 'all'
        ? orders
        : orders.filter(o => o.payment_method === paymentFilter);

    // Generate full hourly data (0-23)
    const fullHourlyData = Array.from({ length: 24 }, (_, i) => {
        const found = stats?.hourlyRevenue?.find(h => h.hour === i);
        return {
            hour: `${i.toString().padStart(2, '0')}:00`,
            orders: found?.orders || 0,
            revenue: found?.revenue || 0,
        };
    });

    // Payment summary
    const cashTotal = stats?.paymentBreakdown?.find(p => p.payment_method === 'cash');
    const transferTotal = stats?.paymentBreakdown?.find(p => p.payment_method === 'transfer');

    if (loading && !stats) {
        return (
            <POSPageWrapper title="ລາຍງານແລະສະຖິຕິ" icon={<BarChart3 size={20} />}>
                <div className="rpt-loading">
                    <div className="rpt-loading-spinner" />
                    <div className="rpt-loading-text">ກຳລັງໂຫຼດຂໍ້ມູນ...</div>
                </div>
            </POSPageWrapper>
        );
    }

    return (
        <POSPageWrapper title="ລາຍງານແລະສະຖິຕິ" icon={<BarChart3 size={20} />} onRefresh={fetchData}>
            {/* Tab Navigation */}
            <div className="rpt-tabs">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`rpt-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="rpt-filters">
                <div className="rpt-quick-filters">
                    {QUICK_FILTERS.map(f => (
                        <button
                            key={f.id}
                            className={`rpt-quick-btn ${quickFilter === f.id ? 'active' : ''}`}
                            onClick={() => handleQuickFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="rpt-date-filters">
                    <Calendar size={14} />
                    <input
                        type="date"
                        className="rpt-date-input"
                        value={dateFrom}
                        onChange={(e) => handleDateChange(e.target.value, dateTo)}
                    />
                    <span className="rpt-date-sep">→</span>
                    <input
                        type="date"
                        className="rpt-date-input"
                        value={dateTo}
                        onChange={(e) => handleDateChange(dateFrom, e.target.value)}
                    />
                </div>
            </div>

            {/* Tab Content */}
            <div className="rpt-content">
                {activeTab === 'dashboard' && stats && <DashboardTab stats={stats} hourlyData={fullHourlyData} />}
                {activeTab === 'payments' && stats && (
                    <PaymentsTab
                        orders={filteredOrders}
                        cashTotal={cashTotal}
                        transferTotal={transferTotal}
                        paymentFilter={paymentFilter}
                        setPaymentFilter={setPaymentFilter}
                        paymentBreakdown={stats.paymentBreakdown}
                    />
                )}
                {activeTab === 'top-products' && stats && <TopProductsTab products={stats.topProducts} />}
                {activeTab === 'revenue' && stats && <RevenueTab stats={stats} />}
                {activeTab === 'summary' && stats && <SummaryTab stats={stats} />}
            </div>
        </POSPageWrapper>
    );
}

/* ====================== TAB COMPONENTS ====================== */

function DashboardTab({ stats, hourlyData }: { stats: Stats; hourlyData: { hour: string; orders: number; revenue: number }[] }) {
    const pieData = stats.paymentBreakdown.map((p, i) => ({
        name: PAYMENT_LABELS[p.payment_method] || p.payment_method,
        value: p.total_revenue,
        color: PIE_COLORS[i % PIE_COLORS.length],
    }));

    return (
        <div className="rpt-dashboard">
            {/* KPI Cards */}
            <div className="rpt-kpi-grid">
                <div className="rpt-kpi-card rpt-kpi-revenue">
                    <div className="rpt-kpi-icon"><DollarSign size={22} /></div>
                    <div className="rpt-kpi-info">
                        <div className="rpt-kpi-label">ລາຍຮັບມື້ນີ້</div>
                        <div className="rpt-kpi-value">{stats.today.revenue.toLocaleString()} <small>ກີບ</small></div>
                    </div>
                    <div className="rpt-kpi-trend up"><ArrowUpRight size={14} /></div>
                </div>

                <div className="rpt-kpi-card rpt-kpi-orders">
                    <div className="rpt-kpi-icon"><ShoppingCart size={22} /></div>
                    <div className="rpt-kpi-info">
                        <div className="rpt-kpi-label">ອໍເດີມື້ນີ້</div>
                        <div className="rpt-kpi-value">{stats.today.orders}</div>
                    </div>
                    <div className="rpt-kpi-badge">{stats.today.orders > 0 ? 'Active' : 'Idle'}</div>
                </div>

                <div className="rpt-kpi-card rpt-kpi-avg">
                    <div className="rpt-kpi-icon"><TrendingUp size={22} /></div>
                    <div className="rpt-kpi-info">
                        <div className="rpt-kpi-label">ສະເລ່ຍ/ອໍເດີ</div>
                        <div className="rpt-kpi-value">{stats.today.avgOrderValue.toLocaleString()} <small>ກີບ</small></div>
                    </div>
                </div>

                <div className="rpt-kpi-card rpt-kpi-products">
                    <div className="rpt-kpi-icon"><Package size={22} /></div>
                    <div className="rpt-kpi-info">
                        <div className="rpt-kpi-label">ສິນຄ້າຂາຍໄດ້</div>
                        <div className="rpt-kpi-value">{stats.today.productsSold}</div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="rpt-charts-row">
                {/* Revenue Chart */}
                <div className="rpt-chart-card rpt-chart-wide">
                    <div className="rpt-chart-header">
                        <h3>📈 ລາຍຮັບລາຍວັນ</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={stats.dailyRevenue}>
                            <defs>
                                <linearGradient id="rptRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="date" stroke="#5a5a7a" fontSize={11} tickLine={false} />
                            <YAxis stroke="#5a5a7a" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px' }}
                                formatter={(value: number) => [`₭${value.toLocaleString()}`, 'ລາຍຮັບ']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#6c5ce7" strokeWidth={2.5} fill="url(#rptRevenueGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Pie Chart */}
                <div className="rpt-chart-card rpt-chart-narrow">
                    <div className="rpt-chart-header">
                        <h3>💳 ວິທີຊຳລະ</h3>
                    </div>
                    {pieData.length === 0 ? (
                        <div className="rpt-empty-mini">ບໍ່ມີຂໍ້ມູນ</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    dataKey="value"
                                    stroke="none"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px' }}
                                    formatter={(value: number) => [`₭${value.toLocaleString()}`, '']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Hourly Bar Chart */}
            <div className="rpt-chart-card">
                <div className="rpt-chart-header">
                    <h3><Clock size={16} /> ຍອດຂາຍຕາມຊົ່ວໂມງ</h3>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="hour" stroke="#5a5a7a" fontSize={10} tickLine={false} interval={1} />
                        <YAxis stroke="#5a5a7a" fontSize={11} tickLine={false} />
                        <Tooltip
                            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px' }}
                            formatter={(value: number, name: string) => [
                                name === 'revenue' ? `₭${value.toLocaleString()}` : value,
                                name === 'revenue' ? 'ລາຍຮັບ' : 'ອໍເດີ'
                            ]}
                        />
                        <Legend />
                        <Bar dataKey="orders" name="ອໍເດີ" fill="#00cec9" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="revenue" name="ລາຍຮັບ" fill="#6c5ce7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function PaymentsTab({
    orders,
    cashTotal,
    transferTotal,
    paymentFilter,
    setPaymentFilter,
    paymentBreakdown,
}: {
    orders: Order[];
    cashTotal?: { payment_method: string; order_count: number; total_revenue: number };
    transferTotal?: { payment_method: string; order_count: number; total_revenue: number };
    paymentFilter: string;
    setPaymentFilter: (v: string) => void;
    paymentBreakdown: { payment_method: string; order_count: number; total_revenue: number }[];
}) {
    return (
        <div className="rpt-payments">
            {/* Payment Summary Cards */}
            <div className="rpt-payment-summary">
                <div className="rpt-payment-card rpt-pay-cash" onClick={() => setPaymentFilter(paymentFilter === 'cash' ? 'all' : 'cash')}>
                    <div className="rpt-pay-icon"><Banknote size={24} /></div>
                    <div className="rpt-pay-info">
                        <div className="rpt-pay-label">ເງິນສົດ</div>
                        <div className="rpt-pay-value">{(cashTotal?.total_revenue || 0).toLocaleString()} ກີບ</div>
                        <div className="rpt-pay-count">{cashTotal?.order_count || 0} ລາຍການ</div>
                    </div>
                    {paymentFilter === 'cash' && <div className="rpt-pay-active-dot" />}
                </div>

                <div className="rpt-payment-card rpt-pay-transfer" onClick={() => setPaymentFilter(paymentFilter === 'transfer' ? 'all' : 'transfer')}>
                    <div className="rpt-pay-icon"><CreditCard size={24} /></div>
                    <div className="rpt-pay-info">
                        <div className="rpt-pay-label">ເງິນໂອນ</div>
                        <div className="rpt-pay-value">{(transferTotal?.total_revenue || 0).toLocaleString()} ກີບ</div>
                        <div className="rpt-pay-count">{transferTotal?.order_count || 0} ລາຍການ</div>
                    </div>
                    {paymentFilter === 'transfer' && <div className="rpt-pay-active-dot" />}
                </div>

                {paymentBreakdown.filter(p => !['cash', 'transfer'].includes(p.payment_method)).map(p => (
                    <div key={p.payment_method} className="rpt-payment-card rpt-pay-other" onClick={() => setPaymentFilter(paymentFilter === p.payment_method ? 'all' : p.payment_method)}>
                        <div className="rpt-pay-icon"><Wallet size={24} /></div>
                        <div className="rpt-pay-info">
                            <div className="rpt-pay-label">{PAYMENT_LABELS[p.payment_method] || p.payment_method}</div>
                            <div className="rpt-pay-value">{p.total_revenue.toLocaleString()} ກີບ</div>
                            <div className="rpt-pay-count">{p.order_count} ລາຍການ</div>
                        </div>
                        {paymentFilter === p.payment_method && <div className="rpt-pay-active-dot" />}
                    </div>
                ))}
            </div>

            {/* Payment Filter Buttons */}
            <div className="rpt-pay-filter-row">
                <Filter size={14} />
                <button className={`rpt-pay-filter-btn ${paymentFilter === 'all' ? 'active' : ''}`} onClick={() => setPaymentFilter('all')}>
                    ທັງໝົດ
                </button>
                <button className={`rpt-pay-filter-btn cash ${paymentFilter === 'cash' ? 'active' : ''}`} onClick={() => setPaymentFilter('cash')}>
                    💵 ເງິນສົດ
                </button>
                <button className={`rpt-pay-filter-btn transfer ${paymentFilter === 'transfer' ? 'active' : ''}`} onClick={() => setPaymentFilter('transfer')}>
                    💳 ເງິນໂອນ
                </button>
            </div>

            {/* Transactions Table */}
            <div className="rpt-table-card">
                <div className="rpt-table-header">
                    <h3>📋 ລາຍການທັງໝົດ</h3>
                    <span className="rpt-table-count">{orders.length} ລາຍການ</span>
                </div>
                <div className="rpt-table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ເລກໃບບິນ</th>
                                <th>ວັນທີ</th>
                                <th>ພະນັກງານ</th>
                                <th>ວິທີຊຳລະ</th>
                                <th>ຍອດລວມ</th>
                                <th>ຮັບມາ</th>
                                <th>ເງິນທອນ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan={7} className="rpt-empty-cell">ບໍ່ມີຂໍ້ມູນ</td></tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id}>
                                        <td className="rpt-cell-id">#{order.id}</td>
                                        <td className="rpt-cell-date">{new Date(order.created_at).toLocaleString('lo-LA')}</td>
                                        <td>{order.cashier || '-'}</td>
                                        <td>
                                            <span className={`rpt-pay-badge ${order.payment_method}`}>
                                                {order.payment_method === 'cash' ? '💵' : '💳'} {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                                            </span>
                                        </td>
                                        <td className="rpt-cell-total">{order.total.toLocaleString()} ກີບ</td>
                                        <td>{order.amount_paid.toLocaleString()} ກີບ</td>
                                        <td>{order.change_amount.toLocaleString()} ກີບ</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function TopProductsTab({ products }: { products: { name: string; total_sold: number; total_revenue: number }[] }) {
    const maxSold = products.length > 0 ? products[0].total_sold : 1;

    const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
    const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

    return (
        <div className="rpt-top-products">
            <div className="rpt-section-title">
                <Trophy size={20} />
                <h3>ສິນຄ້າຂາຍດີ Top 10</h3>
            </div>

            {products.length === 0 ? (
                <div className="rpt-empty-state">
                    <div className="rpt-empty-icon">🏆</div>
                    <div>ບໍ່ມີຂໍ້ມູນສິນຄ້າຂາຍດີ</div>
                </div>
            ) : (
                <div className="rpt-ranking-list">
                    {products.map((product, i) => {
                        const percent = (product.total_sold / maxSold) * 100;
                        const isTop3 = i < 3;
                        return (
                            <div key={product.name} className={`rpt-rank-item ${isTop3 ? 'top3' : ''}`}>
                                <div className="rpt-rank-position" style={isTop3 ? { color: RANK_COLORS[i], textShadow: `0 0 10px ${RANK_COLORS[i]}40` } : {}}>
                                    {isTop3 ? RANK_EMOJIS[i] : <span className="rpt-rank-num">{i + 1}</span>}
                                </div>
                                <div className="rpt-rank-info">
                                    <div className="rpt-rank-name">{product.name}</div>
                                    <div className="rpt-rank-bar-wrapper">
                                        <div
                                            className="rpt-rank-bar"
                                            style={{
                                                width: `${percent}%`,
                                                background: isTop3
                                                    ? `linear-gradient(90deg, ${RANK_COLORS[i]}40, ${RANK_COLORS[i]})`
                                                    : 'linear-gradient(90deg, rgba(108,92,231,0.2), rgba(108,92,231,0.6))',
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="rpt-rank-stats">
                                    <div className="rpt-rank-sold">{product.total_sold} ຊິ້ນ</div>
                                    <div className="rpt-rank-revenue">{product.total_revenue.toLocaleString()} ກີບ</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function RevenueTab({ stats }: { stats: Stats }) {
    return (
        <div className="rpt-revenue">
            {/* Revenue Chart */}
            <div className="rpt-chart-card">
                <div className="rpt-chart-header">
                    <h3>📊 ລາຍຮັບລາຍວັນ</h3>
                    <span className="rpt-chart-total">ລວມ: {stats.revenue.total.toLocaleString()} ກີບ</span>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={stats.dailyRevenue}>
                        <defs>
                            <linearGradient id="rptRevGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00cec9" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#00cec9" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="rptOrdGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" stroke="#5a5a7a" fontSize={11} tickLine={false} />
                        <YAxis yAxisId="rev" stroke="#5a5a7a" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="ord" orientation="right" stroke="#5a5a7a" fontSize={11} tickLine={false} />
                        <Tooltip
                            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px' }}
                            formatter={(value: number, name: string) => [
                                name === 'revenue' ? `₭${value.toLocaleString()}` : value,
                                name === 'revenue' ? 'ລາຍຮັບ' : 'ອໍເດີ'
                            ]}
                        />
                        <Legend />
                        <Area yAxisId="rev" type="monotone" dataKey="revenue" name="ລາຍຮັບ" stroke="#00cec9" strokeWidth={2.5} fill="url(#rptRevGrad2)" />
                        <Area yAxisId="ord" type="monotone" dataKey="orders" name="ອໍເດີ" stroke="#6c5ce7" strokeWidth={2} fill="url(#rptOrdGrad2)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Revenue Table */}
            <div className="rpt-table-card">
                <div className="rpt-table-header">
                    <h3>📅 ລາຍລະອຽດລາຍຮັບ</h3>
                </div>
                <div className="rpt-table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ວັນທີ</th>
                                <th>ຈຳນວນອໍເດີ</th>
                                <th>ລາຍຮັບ</th>
                                <th>ສະພາບ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.dailyRevenue.length === 0 ? (
                                <tr><td colSpan={4} className="rpt-empty-cell">ບໍ່ມີຂໍ້ມູນ</td></tr>
                            ) : (
                                [...stats.dailyRevenue].reverse().map((d: { date: string; orders: number; revenue: number }, i: number, arr: { date: string; orders: number; revenue: number }[]) => {
                                    const prev = arr[i + 1];
                                    const trend = prev ? d.revenue - prev.revenue : 0;
                                    return (
                                        <tr key={d.date}>
                                            <td className="rpt-cell-date">{d.date}</td>
                                            <td>{d.orders}</td>
                                            <td className="rpt-cell-total">{d.revenue.toLocaleString()} ກີບ</td>
                                            <td>
                                                {trend > 0 && <span className="rpt-trend-up"><ArrowUpRight size={12} /> +{trend.toLocaleString()}</span>}
                                                {trend < 0 && <span className="rpt-trend-down"><ArrowDownRight size={12} /> {trend.toLocaleString()}</span>}
                                                {trend === 0 && <span className="rpt-trend-flat">—</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SummaryTab({ stats }: { stats: Stats }) {
    return (
        <div className="rpt-summary">
            <div className="rpt-summary-grid">
                <div className="rpt-summary-card green">
                    <DollarSign size={28} />
                    <div className="rpt-summary-info">
                        <div className="rpt-summary-label">ລາຍຮັບທັງໝົດ</div>
                        <div className="rpt-summary-value">{stats.revenue.total.toLocaleString()} ກີບ</div>
                    </div>
                </div>

                <div className="rpt-summary-card blue">
                    <ShoppingCart size={28} />
                    <div className="rpt-summary-info">
                        <div className="rpt-summary-label">ອໍເດີທັງໝົດ</div>
                        <div className="rpt-summary-value">{stats.orders.total}</div>
                    </div>
                </div>

                <div className="rpt-summary-card purple">
                    <Package size={28} />
                    <div className="rpt-summary-info">
                        <div className="rpt-summary-label">ສິນຄ້າທັງໝົດ</div>
                        <div className="rpt-summary-value">{stats.products.total}</div>
                    </div>
                </div>

                <div className="rpt-summary-card yellow">
                    <AlertTriangle size={28} />
                    <div className="rpt-summary-info">
                        <div className="rpt-summary-label">ສະຕ໊ອກຕ່ຳ</div>
                        <div className="rpt-summary-value">{stats.products.lowStock}</div>
                    </div>
                </div>

                <div className="rpt-summary-card red">
                    <Package size={28} />
                    <div className="rpt-summary-info">
                        <div className="rpt-summary-label">ໝົດສະຕ໊ອກ</div>
                        <div className="rpt-summary-value">{stats.products.outOfStock}</div>
                    </div>
                </div>

                <div className="rpt-summary-card teal">
                    <TrendingUp size={28} />
                    <div className="rpt-summary-info">
                        <div className="rpt-summary-label">ລາຍຮັບມື້ນີ້</div>
                        <div className="rpt-summary-value">{stats.today.revenue.toLocaleString()} ກີບ</div>
                    </div>
                </div>
            </div>

            {/* Payment Breakdown */}
            <div className="rpt-table-card">
                <div className="rpt-table-header">
                    <h3>💳 ສະຫຼຸບຕາມວິທີຊຳລະ</h3>
                </div>
                <div className="rpt-table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ວິທີຊຳລະ</th>
                                <th>ຈຳນວນອໍເດີ</th>
                                <th>ລາຍຮັບ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.paymentBreakdown.length === 0 ? (
                                <tr><td colSpan={3} className="rpt-empty-cell">ບໍ່ມີຂໍ້ມູນ</td></tr>
                            ) : (
                                stats.paymentBreakdown.map(p => (
                                    <tr key={p.payment_method}>
                                        <td>
                                            <span className={`rpt-pay-badge ${p.payment_method}`}>
                                                {p.payment_method === 'cash' ? '💵' : '💳'} {PAYMENT_LABELS[p.payment_method] || p.payment_method}
                                            </span>
                                        </td>
                                        <td>{p.order_count}</td>
                                        <td className="rpt-cell-total">{p.total_revenue.toLocaleString()} ກີບ</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
