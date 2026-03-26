'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import POSSidebar from '@/app/components/POSSidebar';

export default function POSLayout({ children }: { children: React.ReactNode }) {
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const stored = localStorage.getItem('pos_auth_user');
        if (!stored) {
            router.replace('/login');
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#0a0a0f',
                color: '#9494b8',
                fontSize: '14px',
            }}>
                ກຳລັງກວດສອບ...
            </div>
        );
    }

    return (
        <div className="pos-layout">
            <POSSidebar />
            {children}
        </div>
    );
}
