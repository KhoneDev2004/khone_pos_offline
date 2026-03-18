'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import { LayoutDashboard, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ShoppingCart, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { toast } from 'react-hot-toast';

interface DailyData {
    date: string;
    orders: number;
    revenue: number;
}

export default function DashboardPage() {
    const [dailyData, setDailyData] = useState<DailyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { year, month } = currentMonth;
            const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month + 1, 0).getDate();
            const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const res = await fetch(`/api/stats?from=${from}&to=${to}`);
            const json = await res.json();
            if (json.status === 'success' && json.data?.dailyRevenue) {
                setDailyData(json.data.dailyRevenue);
            } else {
                setDailyData([]);
            }
        } catch {
            toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ');
            setDailyData([]);
        }
        setLoading(false);
    }, [currentMonth]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const prevMonth = () => {
        setCurrentMonth(prev => {
            if (prev.month === 0) return { year: prev.year - 1, month: 11 };
            return { ...prev, month: prev.month - 1 };
        });
    };

    const nextMonth = () => {
        setCurrentMonth(prev => {
            if (prev.month === 11) return { year: prev.year + 1, month: 0 };
            return { ...prev, month: prev.month + 1 };
        });
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
    };

    // Build data map for quick lookups
    const dataMap = useMemo(() => {
        const map: Record<string, DailyData> = {};
        dailyData.forEach(d => { map[d.date] = d; });
        return map;
    }, [dailyData]);

    // Calendar computations
    const { year, month } = currentMonth;
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month).toLocaleDateString('lo-LA', { month: 'long', year: 'numeric' });

    // Max revenue in month (for heatmap intensity)
    const maxRevenue = useMemo(() => {
        return dailyData.reduce((max, d) => Math.max(max, d.revenue), 0) || 1;
    }, [dailyData]);

    // Period data: 1st-15th and 16th-end
    const period1Data = useMemo(() => {
        return Array.from({ length: 15 }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const found = dataMap[dateStr];
            return { day: `${day}`, date: dateStr, revenue: found?.revenue || 0, orders: found?.orders || 0 };
        });
    }, [dataMap, year, month]);

    const period2Data = useMemo(() => {
        return Array.from({ length: daysInMonth - 15 }, (_, i) => {
            const day = i + 16;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const found = dataMap[dateStr];
            return { day: `${day}`, date: dateStr, revenue: found?.revenue || 0, orders: found?.orders || 0 };
        });
    }, [dataMap, year, month, daysInMonth]);

    // Stats
    const totalRevenue = dailyData.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = dailyData.reduce((s, d) => s + d.orders, 0);
    const avgDaily = dailyData.length > 0 ? Math.round(totalRevenue / dailyData.length) : 0;
    const bestDay = dailyData.reduce((b, d) => d.revenue > b.revenue ? d : b, { date: '-', revenue: 0, orders: 0 });
    const p1Total = period1Data.reduce((s, d) => s + d.revenue, 0);
    const p2Total = period2Data.reduce((s, d) => s + d.revenue, 0);

    const todayStr = new Date().toISOString().split('T')[0];

    const fontStyle: React.CSSProperties = { fontFamily: "'Phetsarath OT', sans-serif" };

    return (
        <POSPageWrapper title="ແດຊບອດ" icon={<LayoutDashboard size={20} />} onRefresh={fetchData}>
            <div className="db-page" style={fontStyle}>
                {/* Month Navigator */}
                <div className="db-month-nav">
                    <button className="db-nav-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <div className="db-month-title">
                        <span className="db-month-name">{monthName}</span>
                        <button className="db-today-btn" onClick={goToToday}>ມື້ນີ້</button>
                    </div>
                    <button className="db-nav-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
                </div>

                {loading ? (
                    <div className="db-loading">
                        <div className="rpt-loading-spinner" />
                        <div className="rpt-loading-text">ກຳລັງໂຫຼດ...</div>
                    </div>
                ) : (
                    <>
                        {/* KPI Summary */}
                        <div className="db-kpi-row">
                            <div className="db-kpi green">
                                <DollarSign size={20} />
                                <div>
                                    <div className="db-kpi-label">ລາຍຮັບທັງເດືອນ</div>
                                    <div className="db-kpi-value">{totalRevenue.toLocaleString()} <small>ກີບ</small></div>
                                </div>
                            </div>
                            <div className="db-kpi blue">
                                <ShoppingCart size={20} />
                                <div>
                                    <div className="db-kpi-label">ອໍເດີທັງໝົດ</div>
                                    <div className="db-kpi-value">{totalOrders}</div>
                                </div>
                            </div>
                            <div className="db-kpi purple">
                                <TrendingUp size={20} />
                                <div>
                                    <div className="db-kpi-label">ສະເລ່ຍ/ມື້</div>
                                    <div className="db-kpi-value">{avgDaily.toLocaleString()} <small>ກີບ</small></div>
                                </div>
                            </div>
                            <div className="db-kpi gold">
                                <span style={{ fontSize: 20 }}>🏆</span>
                                <div>
                                    <div className="db-kpi-label">ມື້ຂາຍດີ</div>
                                    <div className="db-kpi-value">{bestDay.date !== '-' ? bestDay.date.split('-')[2] + '/' + bestDay.date.split('-')[1] : '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Calendar Heatmap */}
                        <div className="db-calendar-card">
                            <h3>📅 ປະຕິທິນການຂາຍ</h3>
                            <div className="db-calendar-grid">
                                {/* Day headers */}
                                {['ອາ', 'ຈ', 'ອ', 'ພ', 'ພຫ', 'ສ', 'ສ'].map((d, i) => (
                                    <div key={i} className="db-cal-header">{d}</div>
                                ))}
                                {/* Empty cells before first day */}
                                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                                    <div key={`empty-${i}`} className="db-cal-cell empty" />
                                ))}
                                {/* Day cells */}
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const data = dataMap[dateStr];
                                    const revenue = data?.revenue || 0;
                                    const orders = data?.orders || 0;
                                    const intensity = revenue > 0 ? Math.max(0.15, revenue / maxRevenue) : 0;
                                    const isToday = dateStr === todayStr;
                                    const isPeriod1 = day <= 15;

                                    return (
                                        <div
                                            key={day}
                                            className={`db-cal-cell ${isToday ? 'today' : ''} ${revenue > 0 ? 'has-data' : ''}`}
                                            style={{
                                                background: revenue > 0
                                                    ? `rgba(${isPeriod1 ? '108,92,231' : '0,206,201'}, ${intensity})`
                                                    : undefined,
                                            }}
                                            title={`${dateStr}\nລາຍຮັບ: ${revenue.toLocaleString()} ກີບ\nອໍເດີ: ${orders}`}
                                        >
                                            <div className="db-cal-day">{day}</div>
                                            {revenue > 0 && (
                                                <div className="db-cal-amount">
                                                    {revenue >= 1000000 ? `${(revenue / 1000000).toFixed(1)}M` : revenue >= 1000 ? `${(revenue / 1000).toFixed(0)}k` : revenue}
                                                </div>
                                            )}
                                            {orders > 0 && (
                                                <div className="db-cal-orders">{orders} ໃບ</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="db-cal-legend">
                                <span className="db-cal-legend-label">ໜ້ອຍ</span>
                                <div className="db-cal-legend-bar" />
                                <span className="db-cal-legend-label">ຫຼາຍ</span>
                                <div style={{ flex: 1 }} />
                                <span className="db-cal-legend-tag p1">🟣 ງວດ 1 (1-15)</span>
                                <span className="db-cal-legend-tag p2">🟢 ງວດ 2 (16-{daysInMonth})</span>
                            </div>
                        </div>

                        {/* Period Comparison */}
                        <div className="db-period-cards">
                            <div className="db-period-card p1">
                                <div className="db-period-header">
                                    <span>📊 ງວດ 1 (ວັນທີ 1-15)</span>
                                    {p1Total > p2Total ? <TrendingUp size={16} className="db-trend-up" /> : <TrendingDown size={16} className="db-trend-down" />}
                                </div>
                                <div className="db-period-value">{p1Total.toLocaleString()} ກີບ</div>
                                <div className="db-period-orders">{period1Data.reduce((s, d) => s + d.orders, 0)} ອໍເດີ</div>
                            </div>
                            <div className="db-period-card p2">
                                <div className="db-period-header">
                                    <span>📊 ງວດ 2 (ວັນທີ 16-{daysInMonth})</span>
                                    {p2Total > p1Total ? <TrendingUp size={16} className="db-trend-up" /> : <TrendingDown size={16} className="db-trend-down" />}
                                </div>
                                <div className="db-period-value">{p2Total.toLocaleString()} ກີບ</div>
                                <div className="db-period-orders">{period2Data.reduce((s, d) => s + d.orders, 0)} ອໍເດີ</div>
                            </div>
                        </div>

                        {/* Line Chart - Period 1 */}
                        <div className="db-chart-card">
                            <h3>📈 ງວດ 1 — ວັນທີ 1-15</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={period1Data}>
                                    <defs>
                                        <linearGradient id="dbGrad1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="day" stroke="#5a5a7a" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#5a5a7a" fontSize={11} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px', fontFamily: "'Phetsarath OT', sans-serif" }}
                                        formatter={(value: number) => [`₭${value.toLocaleString()}`, 'ລາຍຮັບ']}
                                        labelFormatter={(label) => `ວັນທີ ${label}`}
                                    />
                                    <Legend />
                                    <ReferenceLine y={avgDaily} stroke="#fdcb6e" strokeDasharray="5 5" label={{ value: 'ສະເລ່ຍ', fill: '#fdcb6e', fontSize: 11 }} />
                                    <Line type="monotone" dataKey="revenue" name="ລາຍຮັບ" stroke="#6c5ce7" strokeWidth={3} dot={{ r: 5, fill: '#6c5ce7', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Line Chart - Period 2 */}
                        <div className="db-chart-card">
                            <h3>📈 ງວດ 2 — ວັນທີ 16-{daysInMonth}</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={period2Data}>
                                    <defs>
                                        <linearGradient id="dbGrad2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00cec9" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00cec9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="day" stroke="#5a5a7a" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#5a5a7a" fontSize={11} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px', fontFamily: "'Phetsarath OT', sans-serif" }}
                                        formatter={(value: number) => [`₭${value.toLocaleString()}`, 'ລາຍຮັບ']}
                                        labelFormatter={(label) => `ວັນທີ ${label}`}
                                    />
                                    <Legend />
                                    <ReferenceLine y={avgDaily} stroke="#fdcb6e" strokeDasharray="5 5" label={{ value: 'ສະເລ່ຍ', fill: '#fdcb6e', fontSize: 11 }} />
                                    <Line type="monotone" dataKey="revenue" name="ລາຍຮັບ" stroke="#00cec9" strokeWidth={3} dot={{ r: 5, fill: '#00cec9', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}
            </div>
        </POSPageWrapper>
    );
}
