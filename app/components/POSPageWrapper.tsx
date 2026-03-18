'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import SyncStatus from '@/app/components/SyncStatus';

interface POSPageWrapperProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    onRefresh?: () => void;
    actions?: React.ReactNode;
}

export default function POSPageWrapper({ title, icon, children, onRefresh, actions }: POSPageWrapperProps) {
    return (
        <div className="pos-page-wrapper">
            {/* Top Bar */}
            <header className="pos-topbar">
                <div className="pos-topbar-left">
                    {icon}
                    <h1>{title}</h1>
                </div>
                <div className="pos-topbar-right">
                    <SyncStatus />
                    <Link href="/dashboard" className="pos-topbar-admin">
                        ຜູ້ດູແລລະບົບ
                    </Link>
                    {onRefresh && (
                        <button className="pos-topbar-sync" onClick={onRefresh}>
                            <RefreshCw size={16} />
                        </button>
                    )}
                    {actions}
                </div>
            </header>

            {/* Page Content */}
            <div className="pos-page-content">
                {children}
            </div>
        </div>
    );
}
