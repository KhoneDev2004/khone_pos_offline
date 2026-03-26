'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    PlusCircle,
    ScrollText,
    Monitor,
    ChevronLeft,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/dashboard/products', label: 'Products', icon: Package },
    { href: '/dashboard/products/add', label: 'ເພີ່ມສິນຄ້າ', icon: PlusCircle },
    { href: '/dashboard/logs', label: 'System Logs', icon: ScrollText },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <LayoutDashboard size={24} style={{ color: 'var(--accent-primary)' }} />
                    <h1>POS Dashboard</h1>
                </div>

                <ul className="sidebar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={isActive ? 'active' : ''}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <Icon size={18} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                <div style={{ padding: '0 20px', marginTop: 'auto' }}>
                    <Link href="/pos" className="btn btn-secondary btn-sm w-full" style={{ textDecoration: 'none' }}>
                        <ChevronLeft size={16} />
                        <Monitor size={16} />
                        POS Terminal
                    </Link>
                </div>
            </aside>

            <main className="main-content">{children}</main>
        </div>
    );
}
