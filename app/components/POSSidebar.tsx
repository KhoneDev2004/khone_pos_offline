'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ShoppingCart,
    History,
    Package,
    Import,
    ClipboardList,
    Gift,
    Clock,
    FolderOpen,
    Ruler,
    BarChart3,
    Users,
    UserCog,
    Settings,
    ChevronLeft,
    ChevronRight,
    Barcode,
    FileWarning,
} from 'lucide-react';

const sidebarItems = [
    { id: 'sell', label: 'ຂາຍສິນຄ້າ', icon: ShoppingCart, href: '/pos' },
    { id: 'history', label: 'ປະຫວັດການຂາຍ', icon: History, href: '/pos/history' },
    { id: 'products', label: 'ສິນຄ້າ', icon: Package, href: '/pos/products' },
    { id: 'import', label: 'ນຳເຂົ້າສະຕ໊ອກ', icon: Import, href: '/pos/import' },
    { id: 'stock-history', label: 'ປະຫວັດສະຕ໊ອກ', icon: ClipboardList, href: '/pos/stock-history' },
    { id: 'cancelled-orders', label: 'ປະຫວັດການຍົກເລີກ', icon: FileWarning, href: '/pos/cancelled-orders' },
    { id: 'bonus', label: 'ໂບນັດ', icon: Gift, href: '/pos/bonus' },
    { id: 'category', label: 'ໝວດໝູ່', icon: FolderOpen, href: '/pos/categories' },
    { id: 'unit', label: 'ໜ່ວຍ', icon: Ruler, href: '/pos/units' },
    { id: 'report', label: 'ລາຍງານ', icon: BarChart3, href: '/pos/reports' },
    { id: 'barcode', label: 'ສ້າງບາໂຄ້ດ', icon: Barcode, href: '/pos/barcode' },
    { id: 'member', label: 'ສະມາຊິກ', icon: Users, href: '/pos/members' },
    { id: 'employee', label: 'ຈັດການຜູ້ໃຊ້', icon: UserCog, href: '/pos/employees' },
    { id: 'settings', label: 'ຕັ້ງຄ່າ', icon: Settings, href: '/pos/settings' },
];

export default function POSSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside className={`pos-sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="pos-sidebar-brand">
                <div className="pos-sidebar-logo">
                    <ShoppingCart size={20} />
                </div>
                {!collapsed && (
                    <div>
                        <div className="pos-sidebar-title">POS</div>
                        <div className="pos-sidebar-subtitle">ລະບົບຂາຍເຄື່ອງ</div>
                    </div>
                )}
            </div>

            <nav className="pos-sidebar-nav">
                {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/pos' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`pos-sidebar-item ${isActive ? 'active' : ''}`}
                            title={item.label}
                        >
                            <Icon size={18} />
                            {!collapsed && <span>{item.label}</span>}
                            {isActive && !collapsed && <span className="pos-sidebar-dot" />}
                        </Link>
                    );
                })}
            </nav>

            <button
                className="pos-sidebar-toggle"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        </aside>
    );
}
