'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
    id: number;
    username: string;
    full_name: string;
    role: string;
    permissions: Record<string, boolean>;
}

const AUTH_KEY = 'pos_auth_user';

export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        try {
            const stored = localStorage.getItem(AUTH_KEY);
            if (stored) {
                setUser(JSON.parse(stored));
            }
        } catch {
            localStorage.removeItem(AUTH_KEY);
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok || data.status !== 'success') {
                return { success: false, message: data.message || 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' };
            }

            const authUser: AuthUser = data.data.user;
            localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
            setUser(authUser);
            return { success: true, message: 'ເຂົ້າສູ່ລະບົບສຳເລັດ' };
        } catch {
            return { success: false, message: 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່' };
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(AUTH_KEY);
        setUser(null);
        router.replace('/login');
    }, [router]);

    return { user, isLoading, login, logout };
}
