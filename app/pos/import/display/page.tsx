'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Package, ScanBarcode, Hash, Clock } from 'lucide-react';

interface DisplayItem {
    barcode: string;
    name: string;
    currentStock: number;
    price: number;
    quantity: number;
}

interface DisplayData {
    items: DisplayItem[];
    lastAction?: {
        type: 'add' | 'update' | 'clear' | 'imported';
        barcode?: string;
        name?: string;
    };
}

export default function ImportDisplayPage() {
    const [items, setItems] = useState<DisplayItem[]>([]);
    const [lastBarcode, setLastBarcode] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [imported, setImported] = useState(false);
    const channelRef = useRef<BroadcastChannel | null>(null);

    // Clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // BroadcastChannel listener
    useEffect(() => {
        const channel = new BroadcastChannel('stock-import-display');
        channelRef.current = channel;
        setConnected(true);

        channel.onmessage = (event: MessageEvent<DisplayData>) => {
            const data = event.data;
            setItems(data.items);
            setImported(false);

            if (data.lastAction) {
                if (data.lastAction.type === 'add' || data.lastAction.type === 'update') {
                    setLastBarcode(data.lastAction.barcode || null);
                    setTimeout(() => setLastBarcode(null), 2500);
                } else if (data.lastAction.type === 'clear') {
                    setLastBarcode(null);
                } else if (data.lastAction.type === 'imported') {
                    setImported(true);
                    setTimeout(() => setImported(false), 5000);
                }
            }
        };

        return () => {
            channel.close();
            setConnected(false);
        };
    }, []);

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

    const timeStr = currentTime.toLocaleTimeString('lo-LA', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const dateStr = currentTime.toLocaleDateString('lo-LA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
        <div className="sid-page">
            {/* Header */}
            <header className="sid-header">
                <div className="sid-header-left">
                    <div className="sid-logo">
                        <Package size={28} />
                    </div>
                    <div>
                        <h1 className="sid-title">ນຳເຂົ້າສິນຄ້າ</h1>
                        <p className="sid-subtitle">Stock Import — ລາຍການທີ່ກຳລັງນຳເຂົ້າ</p>
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

            {/* Import Success Banner */}
            {imported && (
                <div className="sid-imported-banner">
                    <div className="sid-imported-icon">✅</div>
                    <span>ນຳເຂົ້າສິນຄ້າສຳເລັດແລ້ວ!</span>
                </div>
            )}

            {/* Main Content */}
            <div className="sid-body">
                {items.length > 0 ? (
                    <>
                        {/* Items List */}
                        <div className="sid-items">
                            <div className="sid-items-header">
                                <ScanBarcode size={18} />
                                <span>ລາຍການສິນຄ້າ</span>
                                <span className="sid-items-count">{items.length}</span>
                            </div>
                            <div className="sid-items-scroll">
                                {items.map((item, idx) => (
                                    <div
                                        key={item.barcode}
                                        className={`sid-item ${lastBarcode === item.barcode ? 'sid-item-highlight' : ''}`}
                                    >
                                        <div className="sid-item-num">{idx + 1}</div>
                                        <div className="sid-item-info">
                                            <div className="sid-item-name">{item.name}</div>
                                            <div className="sid-item-barcode">{item.barcode}</div>
                                        </div>
                                        <div className="sid-item-qty">
                                            <span className="sid-item-qty-label">ຈຳນວນ</span>
                                            <span className="sid-item-qty-value">{item.quantity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary Panel */}
                        <div className="sid-summary-panel">
                            <div className="sid-summary-card">
                                <div className="sid-summary-icon blue">
                                    <Hash size={24} />
                                </div>
                                <div className="sid-summary-info">
                                    <span className="sid-summary-label">ຈຳນວນລາຍການ</span>
                                    <span className="sid-summary-value">{items.length}</span>
                                </div>
                            </div>
                            <div className="sid-summary-card">
                                <div className="sid-summary-icon green">
                                    <Package size={24} />
                                </div>
                                <div className="sid-summary-info">
                                    <span className="sid-summary-label">ຈຳນວນໜ່ວຍລວມ</span>
                                    <span className="sid-summary-value large">{totalItems}</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Empty / Waiting State */
                    <div className="sid-waiting">
                        <div className="sid-waiting-icon">
                            <ScanBarcode size={64} strokeWidth={1} />
                        </div>
                        <h2>ກຳລັງລໍຖ້າ...</h2>
                        <p>ຍິງບາໂຄ້ດໃນໜ້ານຳເຂົ້າສິນຄ້າ<br />ເພື່ອເລີ່ມແສດງລາຍການ</p>
                        <div className="sid-waiting-pulse" />
                    </div>
                )}
            </div>
        </div>
    );
}
