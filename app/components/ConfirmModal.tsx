'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Ban, X, AlertCircle } from 'lucide-react';

export type ConfirmType = 'delete' | 'cancel' | 'warning' | 'info';

interface ConfirmModalProps {
    isOpen: boolean;
    type?: ConfirmType;
    title?: string;
    message: string;
    detail?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

const typeConfig = {
    delete: {
        icon: Trash2,
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
        bgTint: 'rgba(239, 68, 68, 0.08)',
        borderTint: 'rgba(239, 68, 68, 0.2)',
        defaultTitle: 'ຢືນຢັນການລຶບ',
        defaultConfirm: '🗑️ ລຶບ',
        pulseColor: 'rgba(239, 68, 68, 0.4)',
    },
    cancel: {
        icon: Ban,
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
        bgTint: 'rgba(245, 158, 11, 0.08)',
        borderTint: 'rgba(245, 158, 11, 0.2)',
        defaultTitle: 'ຢືນຢັນການຍົກເລີກ',
        defaultConfirm: '🚫 ຍົກເລີກ',
        pulseColor: 'rgba(245, 158, 11, 0.4)',
    },
    warning: {
        icon: AlertTriangle,
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
        bgTint: 'rgba(245, 158, 11, 0.08)',
        borderTint: 'rgba(245, 158, 11, 0.2)',
        defaultTitle: 'ຄຳເຕືອນ',
        defaultConfirm: 'ຢືນຢັນ',
        pulseColor: 'rgba(245, 158, 11, 0.4)',
    },
    info: {
        icon: AlertCircle,
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        bgTint: 'rgba(59, 130, 246, 0.08)',
        borderTint: 'rgba(59, 130, 246, 0.2)',
        defaultTitle: 'ຢືນຢັນ',
        defaultConfirm: 'ຕົກລົງ',
        pulseColor: 'rgba(59, 130, 246, 0.4)',
    },
};

export default function ConfirmModal({
    isOpen, type = 'delete', title, message, detail,
    confirmText, cancelText = 'ຍົກເລີກ', onConfirm, onCancel, loading = false
}: ConfirmModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const config = typeConfig[type];
    const Icon = config.icon;

    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, loading, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="confirm-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current && !loading) onCancel(); }}>
            <div className="confirm-modal">
                {/* Close button */}
                <button className="confirm-close" onClick={onCancel} disabled={loading}>
                    <X size={18} />
                </button>

                {/* Icon */}
                <div className="confirm-icon-wrap">
                    <div className="confirm-icon-ring" style={{ background: config.gradient }}>
                        <Icon size={28} color="#fff" />
                    </div>
                    <div className="confirm-icon-pulse" style={{ background: config.pulseColor }} />
                </div>

                {/* Title */}
                <h3 className="confirm-title" style={{ color: config.color }}>
                    {title || config.defaultTitle}
                </h3>

                {/* Message */}
                <p className="confirm-message">{message}</p>

                {/* Detail box */}
                {detail && (
                    <div className="confirm-detail" style={{ background: config.bgTint, borderColor: config.borderTint }}>
                        {detail}
                    </div>
                )}

                {/* Actions */}
                <div className="confirm-actions">
                    <button className="confirm-btn confirm-btn-cancel" onClick={onCancel} disabled={loading}>
                        {cancelText}
                    </button>
                    <button className="confirm-btn confirm-btn-confirm" onClick={onConfirm} disabled={loading}
                        style={{ background: config.gradient }}>
                        {loading ? (
                            <span className="confirm-spinner" />
                        ) : (
                            confirmText || config.defaultConfirm
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
