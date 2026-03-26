'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/login');
    }, [router]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0a0a0f',
            color: '#9494b8',
            fontSize: '16px',
        }}>
            Loading...
        </div>
    );
}
