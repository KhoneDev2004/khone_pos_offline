'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface SalesData {
    date: string;
    revenue: number;
    orders: number;
}

interface SalesChartProps {
    data: SalesData[];
    title?: string;
}

export default function SalesChart({ data, title = 'Revenue Overview' }: SalesChartProps) {
    return (
        <div className="chart-card">
            <div className="chart-title">{title}</div>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00cec9" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#00cec9" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="date"
                        stroke="#5a5a7a"
                        fontSize={12}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#5a5a7a"
                        fontSize={12}
                        tickLine={false}
                        tickFormatter={(value) => `₭${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#1a1a2e',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            fontSize: '13px',
                        }}
                        labelStyle={{ color: '#9494b8' }}
                        formatter={(value: number, name: string) => [
                            name === 'revenue' ? `₭${value.toLocaleString()}` : value,
                            name === 'revenue' ? 'Revenue' : 'Orders',
                        ]}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6c5ce7"
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                    />
                    <Area
                        type="monotone"
                        dataKey="orders"
                        stroke="#00cec9"
                        strokeWidth={2}
                        fill="url(#ordersGradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
