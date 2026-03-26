'use client';

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, LogIn, Eye, EyeOff, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shake, setShake] = useState(false);
    const router = useRouter();
    const { user, isLoading, login } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/pos');
        }
    }, [user, isLoading, router]);

    // Pre-generate particle styles to avoid hydration mismatches
    const particles = useMemo(() =>
        Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            left: `${(i * 3.33) % 100}%`,
            top: `${(i * 7.77) % 100}%`,
            width: `${(i % 4) + 2}px`,
            height: `${(i % 4) + 2}px`,
            delay: `${(i * 0.6) % 8}s`,
            duration: `${(i % 10) + 10}s`,
            opacity: i % 3 === 0 ? 0.6 : 0.3,
        })), []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ');
            triggerShake();
            return;
        }

        setIsSubmitting(true);
        setError('');

        const result = await login(username.trim(), password);

        if (result.success) {
            router.replace('/pos');
        } else {
            setError(result.message);
            triggerShake();
            setIsSubmitting(false);
        }
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 600);
    };

    // Show nothing while checking auth
    if (isLoading) {
        return (
            <div className="login-page">
                <div className="login-loading">
                    <div className="login-spinner" />
                </div>
            </div>
        );
    }

    // Already logged in, will redirect
    if (user) return null;

    return (
        <div className="login-page">
            {/* Animated background particles */}
            <div className="login-particles">
                {particles.map((p) => (
                    <div
                        key={p.id}
                        className="login-particle"
                        style={{
                            left: p.left,
                            top: p.top,
                            width: p.width,
                            height: p.height,
                            animationDelay: p.delay,
                            animationDuration: p.duration,
                            opacity: p.opacity,
                        }}
                    />
                ))}
            </div>

            {/* Glow orbs */}
            <div className="login-orb login-orb-1" />
            <div className="login-orb login-orb-2" />
            <div className="login-orb login-orb-3" />

            {/* Grid overlay */}
            <div className="login-grid-overlay" />

            <div className={`login-card ${shake ? 'login-shake' : ''}`}>
                {/* Logo / Brand */}
                <div className="login-brand">
                    <div className="login-logo-wrapper">
                        <div className="login-logo-ring" />
                        <div className="login-logo">
                            <ShoppingCart size={32} color="white" />
                        </div>
                    </div>
                    <h1 className="login-title">KHONE POS</h1>
                    <p className="login-subtitle">ລະບົບຂາຍເຄື່ອງ</p>
                    <div className="login-divider">
                        <span className="login-divider-line" />
                        <span className="login-divider-text">ເຂົ້າສູ່ລະບົບ</span>
                        <span className="login-divider-line" />
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="login-error">
                        <span className="login-error-icon">!</span>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-input-group">
                        <div className="login-input-icon">
                            <User size={18} />
                        </div>
                        <input
                            id="login-username"
                            type="text"
                            placeholder="ຊື່ຜູ້ໃຊ້"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="login-input"
                            autoFocus
                            autoComplete="username"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="login-input-group">
                        <div className="login-input-icon">
                            <Lock size={18} />
                        </div>
                        <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="ລະຫັດຜ່ານ"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="login-input"
                            autoComplete="current-password"
                            disabled={isSubmitting}
                        />
                        <button
                            type="button"
                            className="login-eye-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button
                        id="login-submit"
                        type="submit"
                        className="login-submit-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <div className="login-spinner login-spinner-sm" />
                        ) : (
                            <>
                                <LogIn size={20} />
                                ເຂົ້າສູ່ລະບົບ
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <span>KHONE POS — v1.0</span>
                </div>
            </div>
        </div>
    );
}
