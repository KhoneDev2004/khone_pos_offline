'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Cart from '@/app/components/Cart';
import PaymentModal from '@/app/components/PaymentModal';
import BarcodeScanner from '@/app/components/BarcodeScanner';
import { printReceipt } from '@/lib/printReceipt';
import SyncStatus from '@/app/components/SyncStatus';
import { useCart } from '@/app/hooks/useCart';
import { useProducts, Product } from '@/app/hooks/useProducts';
import Link from 'next/link';
import { ShoppingCart, Package, RefreshCw, X, Monitor, Trash2, Phone, UserPlus, PauseCircle, PlayCircle, User, Clock } from 'lucide-react';
import CurrencyWidget from '@/app/components/CurrencyWidget';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Member {
    id: number;
    name: string;
    phone: string;
    points: number;
    total_spent: number;
    visit_count: number;
}

interface ParkedOrder {
    id: string;
    items: ReturnType<typeof useCart>['items'] | { id: number; name: string; barcode: string; price: number; quantity: number; stock: number }[];
    total: number;
    member: Member | null;
    heldAt: string; // time string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function getAvatarColor(name: string): string {
    const colors = ['#4A6CF7', '#6366F1', '#8B5CF6', '#A855F7', '#3B82F6', '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E', '#EAB308', '#F59E0B', '#EF4444', '#F97316', '#EC4899', '#8B5CF6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */
export default function POSSellPage() {
    const { products, loading, refetch } = useProducts();
    const cart = useCart();
    const [showPayment, setShowPayment] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const channelRef = useRef<BroadcastChannel | null>(null);

    /* ---- Member state ---- */
    const [memberPhone, setMemberPhone] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [memberLoading, setMemberLoading] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerName, setRegisterName] = useState('');
    const [registerPhone, setRegisterPhone] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);

    /* ---- Clear cart confirm ---- */
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    /* ---- Parked orders ---- */
    const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>([]);
    const [showParkedPanel, setShowParkedPanel] = useState(false);

    /* ---- BroadcastChannel ---- */
    useEffect(() => {
        channelRef.current = new BroadcastChannel('pos-cart-display');
        return () => { channelRef.current?.close(); };
    }, []);

    useEffect(() => {
        if (channelRef.current) {
            channelRef.current.postMessage({
                items: cart.items,
                total: cart.total,
                itemCount: cart.itemCount
            });
        }
    }, [cart.items, cart.total, cart.itemCount]);

    /* ---------------------------------------------------------------- */
    /*  Products / Search                                                */
    /* ---------------------------------------------------------------- */
    const filteredProducts = searchQuery.trim()
        ? products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase())))
        : products;

    const handleAddToCart = useCallback((product: Product) => {
        if (product.stock <= 0) {
            toast.error(`❌ ${product.name} ໝົດສະຕ໊ອກ — ບໍ່ສາມາດຂາຍໄດ້!`);
            return;
        }
        cart.addItem({ id: product.id, name: product.name, barcode: product.barcode, price: product.price, stock: product.stock });
        if (product.stock <= 10) {
            toast(`⚠️ ${product.name} ເຫຼືອ ${product.stock} ຊິ້ນ — ກະລຸນາເຕີມສະຕ໊ອກ`, { icon: '⚠️', duration: 3000 });
        } else {
            toast.success(`ເພີ່ມ ${product.name} ແລ້ວ`, { duration: 1500 });
        }
    }, [cart]);

    const handleBarcodeScan = useCallback((barcode: string) => {
        const product = products.find((p) => p.barcode === barcode);
        if (product) {
            handleAddToCart(product);
            setSearchQuery('');
        } else {
            toast.error(`ບໍ່ພົບສິນຄ້າ: ${barcode}`);
        }
    }, [products, handleAddToCart]);

    /* ---------------------------------------------------------------- */
    /*  Checkout                                                         */
    /* ---------------------------------------------------------------- */
    const handleCheckout = async (amountPaid: number, paymentMethod: string, shouldPrint: boolean, cashAmount?: number, transferAmount?: number) => {
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.items.map((item) => ({ product_id: item.id, quantity: item.quantity, price: item.price })),
                    payment_method: paymentMethod,
                    amount_paid: amountPaid,
                    cash_amount: cashAmount,
                    transfer_amount: transferAmount,
                    cashier: 'POS',
                    member_phone: selectedMember?.phone || null,
                }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                if (shouldPrint && json.data) {
                    printReceipt(json.data);
                }

                // Update member points if a member was selected
                if (selectedMember) {
                    try {
                        await fetch('/api/members', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone: selectedMember.phone, amount: cart.total }),
                        });
                    } catch { /* non-critical */ }
                }

                channelRef.current?.postMessage({
                    items: [],
                    total: 0,
                    itemCount: 0,
                    action: { type: 'checkout' }
                });

                toast.success('💰 ຊຳລະເງິນສຳເລັດ!');
                cart.clearCart();
                setSelectedMember(null);
                setMemberPhone('');
                setShowPayment(false);
                refetch();
                try { fetch('/api/sync', { method: 'POST' }).catch(() => { }); } catch { }
            } else { toast.error(json.message || 'ຊຳລະເງິນລົ້ມເຫຼວ'); }
        } catch (err) { toast.error('ຊຳລະເງິນລົ້ມເຫຼວ: ' + (err instanceof Error ? err.message : 'Unknown')); }
    };

    /* ---------------------------------------------------------------- */
    /*  Member Lookup                                                    */
    /* ---------------------------------------------------------------- */
    const handleMemberSearch = async () => {
        const phone = memberPhone.trim();
        if (phone.length < 8) return;
        setMemberLoading(true);
        try {
            const res = await fetch(`/api/members?phone=${encodeURIComponent(phone)}`);
            const json = await res.json();
            const members: Member[] = json.data?.members || [];
            if (members.length > 0) {
                setSelectedMember(members[0]);
                toast.success(`👤 ສະມາຊິກ: ${members[0].name}`);
            } else {
                setSelectedMember(null);
                setRegisterPhone(phone);
                setRegisterName('');
                setShowRegisterModal(true);
            }
        } catch {
            toast.error('ຊອກຫາສະມາຊິກລົ້ມເຫຼວ');
        } finally {
            setMemberLoading(false);
        }
    };

    const handleRegisterMember = async () => {
        if (!registerName.trim() || !registerPhone.trim()) {
            toast.error('ກະລຸນາປ້ອນຊື່ ແລະ ເບີໂທ');
            return;
        }
        setRegisterLoading(true);
        try {
            const res = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: registerName.trim(), phone: registerPhone.trim() }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success('✅ ລົງທະບຽນສຳເລັດ!');
                setShowRegisterModal(false);
                // Auto-select the newly registered member
                setSelectedMember({ id: 0, name: registerName.trim(), phone: registerPhone.trim(), points: 0, total_spent: 0, visit_count: 0 });
                setMemberPhone(registerPhone.trim());
            } else {
                toast.error(json.message || 'ລົງທະບຽນລົ້ມເຫຼວ');
            }
        } catch {
            toast.error('ລົງທະບຽນລົ້ມເຫຼວ');
        } finally {
            setRegisterLoading(false);
        }
    };

    /* ---------------------------------------------------------------- */
    /*  Park / Hold Order                                                */
    /* ---------------------------------------------------------------- */
    const handleHoldOrder = () => {
        if (cart.items.length === 0) return;
        const parked: ParkedOrder = {
            id: Date.now().toString(),
            items: [...cart.items],
            total: cart.total,
            member: selectedMember,
            heldAt: new Date().toISOString(),
        };
        setParkedOrders((prev) => [...prev, parked]);
        cart.clearCart();
        setSelectedMember(null);
        setMemberPhone('');
        toast('⏸️ ພັກໂຕະແລ້ວ — ສາມາດຮັບລູກຄ້າຄົນໃໝ່ໄດ້', { duration: 2500 });
    };

    const handleRestoreOrder = (order: ParkedOrder) => {
        // If current cart has items, park them first
        if (cart.items.length > 0) {
            const currentParked: ParkedOrder = {
                id: Date.now().toString(),
                items: [...cart.items],
                total: cart.total,
                member: selectedMember,
                heldAt: new Date().toISOString(),
            };
            setParkedOrders((prev) => [...prev.filter((o) => o.id !== order.id), currentParked]);
        } else {
            setParkedOrders((prev) => prev.filter((o) => o.id !== order.id));
        }

        cart.clearCart();
        // Re-add all items from the parked order
        order.items.forEach((item: any) => {
            cart.addItem({ id: item.id, name: item.name, barcode: item.barcode ?? '', price: item.price, stock: item.stock ?? 9999 });
            if (item.quantity > 1) {
                for (let i = 1; i < item.quantity; i++) {
                    cart.updateQuantity(item.id, i + 1);
                }
            }
        });

        setSelectedMember(order.member);
        setMemberPhone(order.member?.phone || '');
        setShowParkedPanel(false);
        toast.success('▶️ ດຶງໂຕະຄືນແລ້ວ!');
    };

    const handleDiscardParked = (id: string) => {
        setParkedOrders((prev) => prev.filter((o) => o.id !== id));
        toast('🗑️ ລຶບໂຕະທີ່ພັກແລ້ວ', { duration: 1500 });
    };

    /* ---------------------------------------------------------------- */
    /*  Clear Cart                                                       */
    /* ---------------------------------------------------------------- */
    const handleClearCart = () => {
        cart.clearCart();
        setSelectedMember(null);
        setMemberPhone('');
        setShowClearConfirm(false);
        toast('🗑️ ລ້າງລາຍການແລ້ວ', { duration: 1500 });
    };

    /* ---------------------------------------------------------------- */
    /*  Render                                                           */
    /* ---------------------------------------------------------------- */
    return (
        <>
            <BarcodeScanner onScan={handleBarcodeScan} />

            {/* Main Content */}
            <main className="pos-main">
                <header className="pos-topbar">
                    <div className="pos-topbar-left">
                        <ShoppingCart size={20} />
                        <h1>ຂາຍສິນຄ້າ</h1>
                    </div>
                    <div className="pos-topbar-right">
                        <SyncStatus />
                        <Link href="/dashboard" className="pos-topbar-admin">ຜູ້ດູແລລະບົບ</Link>
                        <button className="si-display-btn" onClick={() => window.open('/pos-display', 'pos-cart-display', 'width=900,height=700,menubar=no,toolbar=no,location=no,status=no')} title="ເປີດໜ້າຈໍລູກຄ້າ">
                            <Monitor size={16} />
                            <span>ໜ້າຈໍລູກຄ້າ</span>
                        </button>
                        <button className="pos-topbar-sync" onClick={() => { refetch(); toast.success('ໂຫຼດຂໍ້ມູນໃໝ່ແລ້ວ'); }}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </header>

                <div className="pos-product-area">
                    <div className="pos-action-bar">
                        <button className="pos-import-btn">
                            <ShoppingCart size={16} /> ນຳເຂົ້າສິນຄ້າ
                        </button>
                        <div className="pos-search-wrapper">
                            <Package size={18} className="pos-search-icon" />
                            <input type="text" className="pos-search-input" placeholder="ສະແກນບາໂຄ້ດ ຫຼື ຄົ້ນຫາ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const q = searchQuery.trim();
                                        if (!q) return;
                                        let product = products.find((p) => p.barcode === q);
                                        if (!product) {
                                            product = products.find((p) => p.name.toLowerCase() === q.toLowerCase());
                                        }
                                        if (product) {
                                            handleAddToCart(product);
                                            setSearchQuery('');
                                        } else {
                                            toast.error(`ບໍ່ພົບສິນຄ້າ: ${q}`);
                                            setSearchQuery('');
                                        }
                                    }
                                }}
                                autoFocus />
                            {searchQuery && <button className="pos-search-clear" onClick={() => setSearchQuery('')}><X size={16} /></button>}
                        </div>
                    </div>

                    <div className="pos-product-count">ສິນຄ້າ ({filteredProducts.length})</div>

                    <div className="pos-product-grid">
                        {loading ? (
                            <div className="empty-state"><div className="empty-state-text">ກຳລັງໂຫຼດ...</div></div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-text">{searchQuery ? 'ບໍ່ພົບສິນຄ້າ' : 'ຍັງບໍ່ມີສິນຄ້າ'}</div></div>
                        ) : (
                            filteredProducts.map((product) => (
                                <div key={product.id} className={`pos-product-card ${product.stock <= 0 ? 'pos-card-out' : product.stock <= 10 ? 'pos-card-low' : ''}`} onClick={() => handleAddToCart(product)} style={{ cursor: product.stock <= 0 ? 'not-allowed' : 'pointer' }}>
                                    <div className="pos-product-avatar" style={{ background: getAvatarColor(product.name) }}>{product.name.charAt(0).toUpperCase()}</div>
                                    <div className="pos-product-name" title={product.name}>{product.name}</div>
                                    <div className="pos-product-price">{product.price.toLocaleString()} ກີບ</div>
                                    <div className={`pos-product-stock ${product.stock <= 0 ? 'stock-out' : product.stock <= 10 ? 'stock-low' : ''}`}>
                                        {product.stock <= 0 ? '❌ ໝົດສະຕ໊ອກ' : product.stock <= 10 ? `⚠️ ເຫຼືອ ${product.stock} ຊິ້ນ` : `ສະຕ໊ອກ: ${product.stock}`}
                                    </div>
                                    {product.stock <= 0 && <div className="pos-card-overlay">ໝົດ</div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Cart Sidebar */}
            <aside className="pos-cart">
                {/* Cart Header */}
                <div className="pos-cart-header">
                    <div className="pos-cart-title">
                        <ShoppingCart size={18} />
                        <span>ກະຕ່າ</span>
                        <span className="pos-cart-badge">{cart.itemCount}</span>
                        {/* Parked orders badge */}
                        {parkedOrders.length > 0 && (
                            <button
                                className="pos-parked-badge"
                                onClick={() => setShowParkedPanel((v) => !v)}
                                title="ໂຕະທີ່ພັກໄວ້"
                            >
                                <PauseCircle size={13} />
                                {parkedOrders.length}
                            </button>
                        )}
                    </div>
                    {/* Clear cart button */}
                    {cart.items.length > 0 && !showClearConfirm && (
                        <button
                            className="pos-clear-btn"
                            onClick={() => setShowClearConfirm(true)}
                            title="ລ້າງລາຍການທັງໝົດ"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                    {showClearConfirm && (
                        <div className="pos-clear-confirm">
                            <span>ລ້າງ?</span>
                            <button className="pos-clear-confirm-yes" onClick={handleClearCart}>ຢືນຢັນ</button>
                            <button className="pos-clear-confirm-no" onClick={() => setShowClearConfirm(false)}>ຍົກເລີກ</button>
                        </div>
                    )}
                </div>

                {/* Parked Orders Panel */}
                {showParkedPanel && parkedOrders.length > 0 && (
                    <div className="pos-parked-panel">
                        <div className="pos-parked-panel-title">
                            <PauseCircle size={14} /> ໂຕະທີ່ພັກໄວ້ ({parkedOrders.length})
                        </div>
                        {parkedOrders.map((order) => (
                            <div key={order.id} className="pos-parked-item">
                                <div className="pos-parked-item-info">
                                    <div className="pos-parked-item-time">
                                        <Clock size={11} /> {formatTime(order.heldAt)}
                                    </div>
                                    <div className="pos-parked-item-meta">
                                        {order.items.length} ລາຍການ · {order.total.toLocaleString()} ກີບ
                                        {order.member && <span className="pos-parked-member"> · {order.member.name}</span>}
                                    </div>
                                </div>
                                <div className="pos-parked-item-actions">
                                    <button className="pos-parked-restore" onClick={() => handleRestoreOrder(order)} title="ດຶງຄືນ">
                                        <PlayCircle size={14} />
                                    </button>
                                    <button className="pos-parked-discard" onClick={() => handleDiscardParked(order.id)} title="ລຶບ">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Member Lookup */}
                <div className="pos-cart-member">
                    {selectedMember ? (
                        <div className="pos-member-info">
                            <div className="pos-member-info-left">
                                <div className="pos-member-avatar" style={{ background: getAvatarColor(selectedMember.name) }}>
                                    {selectedMember.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="pos-member-name">{selectedMember.name}</div>
                                    <div className="pos-member-meta">{selectedMember.phone} · ⭐ {selectedMember.points} ຄະແນນ</div>
                                </div>
                            </div>
                            <button className="pos-member-clear" onClick={() => { setSelectedMember(null); setMemberPhone(''); }}>
                                <X size={13} />
                            </button>
                        </div>
                    ) : (
                        <div className="pos-member-phone-row">
                            <Phone size={15} className="pos-member-phone-icon" />
                            <input
                                type="tel"
                                className="pos-member-phone-input"
                                placeholder="ປ້ອນເບີໂທສະມາຊິກ..."
                                value={memberPhone}
                                onChange={(e) => setMemberPhone(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleMemberSearch(); }}
                            />
                            <button
                                className="pos-member-search-btn"
                                onClick={handleMemberSearch}
                                disabled={memberLoading || memberPhone.trim().length < 8}
                                title="ຊອກຫາ"
                            >
                                {memberLoading ? '...' : <User size={14} />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="pos-cart-items">
                    {cart.items.length === 0 ? (
                        <div className="pos-cart-empty"><ShoppingCart size={48} strokeWidth={1} /><p>ຍັງບໍ່ມີສິນຄ້າ</p></div>
                    ) : (
                        cart.items.map((item) => (
                            <div key={item.id} className="pos-cart-item">
                                <div className="pos-cart-item-info">
                                    <div className="pos-cart-item-name">{item.name}</div>
                                    <div className="pos-cart-item-price">{item.price.toLocaleString()} ກີບ × {item.quantity}</div>
                                </div>
                                <div className="pos-cart-item-controls">
                                    <button className="pos-qty-btn" onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}>−</button>
                                    <span className="pos-qty-value">{item.quantity}</span>
                                    <button className="pos-qty-btn" onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                                </div>
                                <div className="pos-cart-item-subtotal">{(item.price * item.quantity).toLocaleString()} ກີບ</div>
                                <button className="pos-cart-item-remove" onClick={() => cart.removeItem(item.id)}><X size={14} /></button>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Footer */}
                <div className="pos-cart-footer">
                    <div className="pos-cart-summary-row"><span>ຍອດລວມ</span><span>{cart.total.toLocaleString()} ກີບ</span></div>
                    <div className="pos-cart-summary-total"><span>ຍອດສຸດທ້າຍ</span><span className="pos-cart-total-value">{cart.total.toLocaleString()} ກີບ</span></div>
                    {/* Currency conversions */}
                    <CurrencyWidget totalLAK={cart.total} />

                    {/* Hold order button */}
                    <button
                        className="pos-hold-btn"
                        disabled={cart.items.length === 0}
                        onClick={handleHoldOrder}
                    >
                        <PauseCircle size={16} /> ພັກໂຕະ
                    </button>
                    <button className="pos-pay-btn" disabled={cart.items.length === 0} onClick={() => setShowPayment(true)}>💰 ຊຳລະເງິນ</button>
                </div>
            </aside>

            {/* Payment Modal */}
            {showPayment && <PaymentModal items={cart.items} total={cart.total} onConfirm={handleCheckout} onClose={() => setShowPayment(false)} />}

            {/* Register Member Modal */}
            {showRegisterModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowRegisterModal(false); }}>
                    <div className="pos-register-modal">
                        <div className="pos-register-modal-header">
                            <UserPlus size={20} />
                            <h2>ລົງທະບຽນສະມາຊິກໃໝ່</h2>
                        </div>
                        <p className="pos-register-modal-sub">ບໍ່ພົບເບີ <strong>{registerPhone}</strong> — ກະລຸນາປ້ອນຊື່ ເພື່ອລົງທະບຽນ</p>
                        <div className="form-group">
                            <label className="form-label">ເບີໂທ</label>
                            <input
                                className="form-input"
                                type="tel"
                                value={registerPhone}
                                onChange={(e) => setRegisterPhone(e.target.value)}
                                placeholder="020XXXXXXXX"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ຊື່ສະມາຊິກ</label>
                            <input
                                className="form-input"
                                type="text"
                                value={registerName}
                                onChange={(e) => setRegisterName(e.target.value)}
                                placeholder="ປ້ອນຊື່..."
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRegisterMember(); }}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>ຍົກເລີກ</button>
                            <button className="btn btn-primary" onClick={handleRegisterMember} disabled={registerLoading}>
                                {registerLoading ? 'ກຳລັງບັນທຶກ...' : '✅ ລົງທະບຽນ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
