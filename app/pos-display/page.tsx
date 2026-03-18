'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Package, CreditCard, Clock } from 'lucide-react';

interface CartItem {
    id: number;
    name: string;
    barcode?: string;
    price: number;
    quantity: number;
    stock: number;
}

interface CartData {
    items: CartItem[];
    total: number;
    itemCount: number;
    action?: {
        type: 'checkout' | 'clear' | 'update';
    };
}

export default function POSDisplayPage() {
    const [cart, setCart] = useState<CartData>({ items: [], total: 0, itemCount: 0 });
    const [connected, setConnected] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMounted, setIsMounted] = useState(false);
    const [checkoutComplete, setCheckoutComplete] = useState(false);
    const channelRef = useRef<BroadcastChannel | null>(null);

    // Clock
    useEffect(() => {
        setIsMounted(true);
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // BroadcastChannel listener
    useEffect(() => {
        const channel = new BroadcastChannel('pos-cart-display');
        channelRef.current = channel;
        setConnected(true);

        channel.onmessage = (event: MessageEvent<CartData>) => {
            const data = event.data;
            setCart({
                items: data.items,
                total: data.total,
                itemCount: data.itemCount
            });
            setCheckoutComplete(false);

            if (data.action) {
                if (data.action.type === 'checkout') {
                    setCheckoutComplete(true);
                    setTimeout(() => setCheckoutComplete(false), 8000);
                }
            }
        };

        return () => {
            channel.close();
            setConnected(false);
        };
    }, []);

    const timeStr = isMounted ? currentTime.toLocaleTimeString('lo-LA', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }) : '--:--:--';
    const dateStr = isMounted ? currentTime.toLocaleDateString('lo-LA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }) : 'ກຳລັງໂຫຼດ...';

    return (
        <div className="sid-page">
            {/* Header */}
            <header className="sid-header">
                <div className="sid-header-left">
                    <div className="sid-logo" style={{ background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)' }}>
                        <ShoppingCart size={28} />
                    </div>
                    <div>
                        <h1 className="sid-title" style={{ background: 'linear-gradient(135deg, #f0f0ff, #7dd3fc)', WebkitBackgroundClip: 'text' }}>ລາຍການສັ່ງຊື້</h1>
                        <p className="sid-subtitle">Customer Display — ລາຍການສິນຄ້າຂອງທ່ານ</p>
                    </div>
                </div>
                <div className="sid-header-right">
                    <div className="sid-clock">
                        <Clock size={16} />
                        <span className="sid-time">{timeStr}</span>
                    </div>
                    <div className="sid-date">{dateStr}</div>
                    <div className={`sid-status ${connected ? 'online' : 'offline'}`}>
                        <span className="sid-status-dot" />
                        {connected ? 'ເຊື່ອມຕໍ່ແລ້ວ' : 'ຢ່າງຕໍ່ເນື່ອງ'}
                    </div>
                </div>
            </header>

            {/* Checkout Success Banner */}
            {checkoutComplete && (
                <div className="sid-imported-banner" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.05))', color: '#4ade80' }}>
                    <div className="sid-imported-icon">🎉</div>
                    <span>ຊຳລະເງິນສຳເລັດແລ້ວ! ຂອບໃຈທີ່ໃຊ້ບໍລິການ</span>
                </div>
            )}

            {/* Main Content */}
            <div className="sid-body" style={{ flexDirection: 'row', gap: '24px' }}>
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {cart.items.length > 0 ? (
                        <div className="sid-items">
                            <div className="sid-items-header">
                                <Package size={18} />
                                <span>ລາຍການສິນຄ້າຂອງທ່ານ</span>
                                <span className="sid-items-count" style={{ background: '#3b82f6' }}>{cart.items.length}</span>
                            </div>
                            <div className="sid-items-scroll">
                                {cart.items.map((item, idx) => (
                                    <div key={item.id} className="sid-item">
                                        <div className="sid-item-num">{idx + 1}</div>
                                        <div className="sid-item-info">
                                            <div className="sid-item-name">{item.name}</div>
                                            <div className="sid-item-barcode" style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 600 }}>
                                                {item.price.toLocaleString()} ກີບ
                                            </div>
                                        </div>
                                        <div className="sid-item-qty" style={{ marginRight: '20px' }}>
                                            <span className="sid-item-qty-label">ຈຳນວນ</span>
                                            <span className="sid-item-qty-value" style={{ color: '#f0f0ff' }}>{item.quantity}</span>
                                        </div>
                                        <div className="sid-item-qty" style={{ alignItems: 'flex-end', minWidth: '120px' }}>
                                            <span className="sid-item-qty-label">ລວມ</span>
                                            <span className="sid-item-qty-value" style={{ color: '#3b82f6' }}>
                                                {(item.price * item.quantity).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Empty / Waiting State */
                        <div className="sid-waiting" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="sid-waiting-icon">
                                <ShoppingCart size={64} strokeWidth={1} />
                            </div>
                            <h2>ຍິນດີຕ້ອນຮັບ</h2>
                            <p>ກະລຸນາລໍຖ້າພະນັກງານສະແກນສິນຄ້າ...</p>
                            <div className="sid-waiting-pulse" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }} />
                        </div>
                    )}
                </div>

                {/* Right Summary Panel */}
                <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="sid-summary-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '32px 28px', gap: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>ຈຳນວນອໍເດີ</span>
                            <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{cart.itemCount} <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>ຊິ້ນ</span></span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>ຍອດລວມທັງໝົດ</span>
                            <span style={{ fontSize: '48px', fontWeight: 800, color: '#0ea5e9', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                                {cart.total.toLocaleString()}
                            </span>
                            <span style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 600, textAlign: 'right' }}>ກີບ</span>
                        </div>
                    </div>

                    <div className="sid-summary-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.05))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', flex: 1 }}>
                        <CreditCard size={48} style={{ color: '#3b82f6', marginBottom: '16px', opacity: 0.8 }} strokeWidth={1.5} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#f0f0ff' }}>ພ້ອມຮັບຊຳລະເງິນ</h3>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                            ຮັບຊຳລະຜ່ານເງິນສົດ<br />ແລະ ເງິນໂອນ (QR Code)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
