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
import { ShoppingCart, RefreshCw, X, Monitor, Trash2, Phone, UserPlus, PauseCircle, PlayCircle, Clock, ScanBarcode, User, LogOut, Lightbulb, Sun, Moon } from 'lucide-react';
import CurrencyWidget from '@/app/components/CurrencyWidget';
import { useAuth } from '@/app/hooks/useAuth';

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
    const { logout } = useAuth();
    const [showPayment, setShowPayment] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const memberInputRef = useRef<HTMLInputElement | null>(null);

    /* ---- Member state ---- */
    const [memberPhone, setMemberPhone] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [memberLoading, setMemberLoading] = useState(false);
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);

    /* ---- Theme Dropdown ---- */
    const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('dark');
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const themeDropdownRef = useRef<HTMLDivElement | null>(null);
    const [showMemberDropdown, setShowMemberDropdown] = useState(false);
    const [isSearchingMember, setIsSearchingMember] = useState(false);
    const memberDropdownRef = useRef<HTMLDivElement | null>(null);

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerName, setRegisterName] = useState('');
    const [registerPhone, setRegisterPhone] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);

    /* ---- Clear cart confirm ---- */
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    /* ---- Parked orders ---- */
    const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>([]);
    const [showParkedPanel, setShowParkedPanel] = useState(false);

    /* ---- Search Modals ---- */
    const [showProductSearchModal, setShowProductSearchModal] = useState(false);
    const [showQuickProductsModal, setShowQuickProductsModal] = useState(false);
    const [modalSearchQuery, setModalSearchQuery] = useState('');

    /* ---- Tax and Discount ---- */
    const [taxOption, setTaxOption] = useState<'NONE' | 'VAT_IN' | 'VAT_OUT'>('NONE');
    const [billDiscount, setBillDiscount] = useState<number>(0);

    /* ---- Live clock ---- */
    const [now, setNow] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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

    /* ---- Keyboard Shortcuts ---- */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

            // Enter → Checkout (only if not typing in an input)
            if (e.key === 'Enter' && !isInput && cart.items.length > 0 && !showPayment) {
                e.preventDefault();
                setShowPayment(true);
                return;
            }

            // F1 → Open cash drawer
            if (e.key === 'F1') {
                e.preventDefault();
                toast.success('💵 ເປີດລິ້ນຊັກເກັບເງິນ', { duration: 2000 });
                // TODO: Send command to open physical cash drawer
                return;
            }

            // F2 → Focus member search
            if (e.key === 'F2') {
                e.preventDefault();
                memberInputRef.current?.focus();
                return;
            }

            // F3 → Open product search modal
            if (e.key === 'F3') {
                e.preventDefault();
                setShowProductSearchModal(true);
                return;
            }

            // F4 → Open quick products modal
            if (e.key === 'F4') {
                e.preventDefault();
                setShowQuickProductsModal(true);
                return;
            }

            // F5 → Scan serial (focus search input with prompt)
            if (e.key === 'F5') {
                e.preventDefault();
                searchInputRef.current?.focus();
                setSearchQuery('');
                toast('🔍 ສະແກນຊີຣຽນ — ກະລຸນາສະແກນ', { icon: '📱', duration: 2000 });
                return;
            }

            // ESC → Close all modals and panels
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowPayment(false);
                setShowRegisterModal(false);
                setShowProductSearchModal(false);
                setShowQuickProductsModal(false);
                setShowParkedPanel(false);
                setShowClearConfirm(false);
                setModalSearchQuery('');
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart.items.length, showPayment]);

    /* ---- Click outside member dropdown to close ---- */
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
                setShowMemberDropdown(false);
            }
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
                setShowThemeDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ---------------------------------------------------------------- */
    /*  Products / Search                                                */
    /* ---------------------------------------------------------------- */
    const filteredProducts = searchQuery.trim()
        ? products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase())))
        : products;

    const handleAddToCart = useCallback((product: Product) => {
        if (product.stock <= 0) {
            toast.error(`❌ ${product.name} ໝົດສະຕ໊ອກ — ບໍ່ສາມາດຂາຍໄດ້!`);
            setLastScannedProduct(product);
            return;
        }
        cart.addItem({ id: product.id, name: product.name, barcode: product.barcode, price: product.price, stock: product.stock });
        setLastScannedProduct(product);
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
    
    const handleMemberInput = async (val: string) => {
        setMemberPhone(val);
        if (!val.trim()) {
            setMemberSearchResults([]);
            setShowMemberDropdown(false);
            return;
        }
        setIsSearchingMember(true);
        setShowMemberDropdown(true);
        try {
            const res = await fetch(`/api/members?search=${encodeURIComponent(val.trim())}`);
            const json = await res.json();
            setMemberSearchResults(json.data?.members || []);
        } catch {
            // silent fail for auto-complete
        } finally {
            setIsSearchingMember(false);
        }
    };

    /* Exact match trigger fallback */
    const handleMemberSearch = async () => {
        const phone = memberPhone.trim();
        if (!phone) return;
        setMemberLoading(true);
        try {
            const res = await fetch(`/api/members?phone=${encodeURIComponent(phone)}`);
            const json = await res.json();
            const members: Member[] = json.data?.members || [];
            if (members.length > 0) {
                setSelectedMember(members[0]);
                toast.success(`👤 ສະມາຊິກ: ${members[0].name}`);
                setShowMemberDropdown(false);
            } else {
                toast.error('ບໍ່ພົບສະມາຊິກ');
                setSelectedMember(null);
                setMemberPhone('');
                setShowMemberDropdown(false);
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
    /*  Tax & Discount Calculations                                      */
    /* ---------------------------------------------------------------- */
    const VAT_RATE = 0.07;
    let subtotal = cart.total;
    let vatAmount = 0;
    let grandTotal = subtotal;

    if (taxOption === 'VAT_IN') {
        const priceExclVat = subtotal / (1 + VAT_RATE);
        vatAmount = subtotal - priceExclVat;
        subtotal = priceExclVat;
        grandTotal = cart.total - (billDiscount || 0);
    } else if (taxOption === 'VAT_OUT') {
        vatAmount = subtotal * VAT_RATE;
        grandTotal = subtotal + vatAmount - (billDiscount || 0);
    } else {
        vatAmount = 0;
        grandTotal = subtotal - (billDiscount || 0);
    }
    grandTotal = Math.max(0, grandTotal);

    /* ---------------------------------------------------------------- */
    /*  Render                                                           */
    /* ---------------------------------------------------------------- */
    return (
        <>
            <BarcodeScanner onScan={handleBarcodeScan} />

            {/* Main Content */}
            <main className="pos-main">
                <div className="pos-product-area">
                    {/* Row 1: Customer search */}
                    <div className="pt-customer-row">
                        <div className="pt-customer-search">
                            <Phone size={16} className="pt-customer-icon" />
                            {selectedMember ? (
                                <div className="pt-member-selected">
                                    <span className="pt-member-selected-name">👤 {selectedMember.name}</span>
                                    <span className="pt-member-selected-phone">{selectedMember.phone}</span>
                                    <span className="pt-member-selected-points">⭐ {selectedMember.points}</span>
                                    <button className="pt-member-clear-btn" onClick={() => { setSelectedMember(null); setMemberPhone(''); }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="pt-member-search-wrapper" ref={memberDropdownRef}>
                                        <input
                                            type="tel"
                                            className="pt-customer-input"
                                            placeholder="ຄົ້ນຫາລູກຄ້າດ້ວຍລະຫັດ ຫຼື ເບີໂທ (ກົດ Enter)"
                                            value={memberPhone}
                                            onChange={(e) => handleMemberInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleMemberSearch(); }}
                                            ref={memberInputRef}
                                            onFocus={(e) => { if (e.target.value.trim()) setShowMemberDropdown(true); }}
                                        />
                                        {showMemberDropdown && (
                                            <div className="pt-member-dropdown">
                                                {isSearchingMember ? (
                                                    <div className="pt-member-dropdown-empty">ກຳລັງຄົ້ນຫາ...</div>
                                                ) : memberSearchResults.length > 0 ? (
                                                    memberSearchResults.map((m) => (
                                                        <div 
                                                            key={m.id} 
                                                            className="pt-member-dropdown-item"
                                                            onClick={() => {
                                                                setSelectedMember(m);
                                                                setMemberPhone(m.phone);
                                                                setShowMemberDropdown(false);
                                                                toast.success(`👤 ສະມາຊິກ: ${m.name}`);
                                                            }}
                                                        >
                                                            <div className="pt-mdi-name">{m.name}</div>
                                                            <div className="pt-mdi-phone">{m.phone}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="pt-member-dropdown-empty">ບໍ່ພົບສະມາຊິກ</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button className="pt-customer-search-btn" onClick={handleMemberSearch} disabled={memberLoading || !memberPhone.trim()}>
                                        🔍 ຄົ້ນຫາ
                                    </button>
                                    <button className="pt-customer-add-btn" onClick={() => { setRegisterPhone(memberPhone); setRegisterName(''); setShowRegisterModal(true); }}>
                                        <UserPlus size={14} /> ເພີ່ມ
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Barcode search bar */}
                    <div className="pt-search-row">
                        <div className="pt-search-label">ຄົ້ນຫາສິນຄ້າ / ສະແກນບາໂຄ້ດ / ຊີຣຽນ</div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div className="pt-search-bar" style={{ flex: 1 }}>
                                <ScanBarcode size={18} className="pt-search-icon" />
                                <input
                                    type="text"
                                    className="pt-search-input"
                                    placeholder="ຄົ້ນຫາສິນຄ້າ, ສະແກນບາໂຄ້ດ, ຫຼືຊີຣຽນ (ກົດ Enter ຫຼັງສະແກນ)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const q = searchQuery.trim();
                                            if (!q) return;
                                            let product = products.find((p) => p.barcode === q);
                                            if (!product) {
                                                product = products.find((p) => p.name.toLowerCase() === q.toLowerCase());
                                            }
                                            if (!product) {
                                                product = products.find((p) => p.name.toLowerCase().includes(q.toLowerCase()));
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
                                    autoFocus
                                    ref={searchInputRef}
                                />
                                {searchQuery && <button className="pos-search-clear" onClick={() => setSearchQuery('')}><X size={16} /></button>}
                            </div>
                            <button className="pt-search-btn" onClick={() => {
                                const q = searchQuery.trim();
                                if (!q) return;
                                let product = products.find((p) => p.barcode === q);
                                if (!product) product = products.find((p) => p.name.toLowerCase().includes(q.toLowerCase()));
                                if (product) { handleAddToCart(product); setSearchQuery(''); }
                                else { toast.error(`ບໍ່ພົບສິນຄ້າ: ${q}`); setSearchQuery(''); }
                            }}>
                                ຄົ້ນຫາສິນຄ້າ
                            </button>
                            <button className="pt-search-btn-secondary" onClick={() => setShowProductSearchModal(true)}>
                                🔍 ຄົ້ນຫາ (F3)
                            </button>
                            <button className="pt-quick-btn" onClick={() => setShowQuickProductsModal(true)}>
                                ⚡ ສິນຄ້າລັດ (F4)
                            </button>
                        </div>
                    </div>

                    {/* Row 3: Items Table */}
                    <div className="pt-table-wrap">
                        <table className="pt-table">
                            <thead>
                                <tr>
                                    <th className="pt-th-num">ທີ່</th>
                                    <th className="pt-th-barcode">ບາໂຄ້ດ</th>
                                    <th className="pt-th-name">ຊື່ສິນຄ້າ</th>
                                    <th className="pt-th-qty">ຈຳນວນ ({cart.itemCount})</th>
                                    <th className="pt-th-price">ລາຄາ</th>
                                    <th className="pt-th-discount">ສ່ວນຫຼຸດ</th>
                                    <th className="pt-th-total">ລວມ</th>
                                    <th className="pt-th-actions">ລົບ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="pt-empty-row">
                                            <div className="pt-empty-content">
                                                <ScanBarcode size={40} strokeWidth={1} />
                                                <span>ສະແກນບາໂຄ້ດ ຫຼື ຄົ້ນຫາສິນຄ້າເພື່ອເລີ່ມຂາຍ</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    cart.items.map((item, index) => (
                                        <tr key={item.id} className="pt-item-row">
                                            <td className="pt-td-num">{index + 1}</td>
                                            <td className="pt-td-barcode">{item.barcode || '—'}</td>
                                            <td className="pt-td-name">{item.name}</td>
                                            <td className="pt-td-qty">
                                                <div className="pt-qty-controls">
                                                    <button className="pt-qty-btn" onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}>−</button>
                                                    <span className="pt-qty-value">{item.quantity}</span>
                                                    <button className="pt-qty-btn" onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                                                </div>
                                            </td>
                                            <td className="pt-td-price">₭{item.price.toLocaleString()}</td>
                                            <td className="pt-td-discount">₭0</td>
                                            <td className="pt-td-total">₭{(item.price * item.quantity).toLocaleString()}</td>
                                            <td className="pt-td-actions">
                                                <button className="pt-delete-btn" onClick={() => cart.removeItem(item.id)} title="ລົບ"><Trash2 size={15} /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Keyboard Shortcuts Bar */}
                    <div className="pt-shortcuts-bar">
                        <span className="pt-shortcut"><kbd>Enter</kbd> ຄິດເງິນ</span>
                        <span className="pt-shortcut"><kbd>Space</kbd> ຮັບເງິນພໍດີ</span>
                        <span className="pt-shortcut"><kbd>F1</kbd> ເປີດລິ້ນຊັກ</span>
                        <span className="pt-shortcut"><kbd>F2</kbd> ຄົ້ນຫາສະມາຊິກ</span>
                        <span className="pt-shortcut"><kbd>F3</kbd> ຄົ້ນຫາສິນຄ້າ</span>
                        <span className="pt-shortcut"><kbd>F4</kbd> ສິນຄ້າລັດ</span>
                        <span className="pt-shortcut"><kbd>F5</kbd> ສະແກນຊີຣຽນ</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button className="pt-shortcut-btn" onClick={() => window.open('/pos-display', 'pos-cart-display', 'width=900,height=700,menubar=no,toolbar=no,location=no,status=no')} title="ເປີດໜ້າຈໍລູກຄ້າ">
                                <Monitor size={14} /><span>ໜ້າຈໍລູກຄ້າ</span>
                            </button>
                            <Link href="/dashboard" className="pt-shortcut-btn">ຜູ້ດູແລລະບົບ</Link>
                            <button className="pt-shortcut-btn" onClick={() => { refetch(); toast.success('ໂຫຼດຂໍ້ມູນໃໝ່ແລ້ວ'); }}><RefreshCw size={14} /></button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Right Sidebar */}
            <aside className="pos-cart">
                {/* Date/Time */}
                <div className="pt-sidebar-top">
                    <div className="pt-datetime">
                        <div className="pt-date">{mounted ? now.toLocaleDateString('lo-LA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</div>
                        <div className="pt-time"><Clock size={14} /> {mounted ? now.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="pt-transaction-num"><SyncStatus /></div>
                        
                        <div className="pt-theme-wrapper" ref={themeDropdownRef} style={{ position: 'relative' }}>
                            <button className="pt-theme-btn" onClick={() => setShowThemeDropdown(!showThemeDropdown)} title="ປ່ຽນສີຈໍ">
                                {themeMode === 'light' ? <Sun size={14} /> : themeMode === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
                            </button>
                            {showThemeDropdown && (
                                <div className="pt-theme-dropdown">
                                    <button className={`pt-theme-item ${themeMode === 'light' ? 'active' : ''}`} onClick={() => { setThemeMode('light'); toast('💡 ອັບເດດ Theme ເປັນ Light (ກຳລັງພັດທະນາระบบ)'); setShowThemeDropdown(false); }}>
                                        <Sun size={14} /> <span>Light</span>
                                    </button>
                                    <button className={`pt-theme-item ${themeMode === 'dark' ? 'active' : ''}`} onClick={() => { setThemeMode('dark'); setShowThemeDropdown(false); }}>
                                        <Moon size={14} /> <span>Dark</span>
                                    </button>
                                    <button className={`pt-theme-item ${themeMode === 'system' ? 'active' : ''}`} onClick={() => { setThemeMode('system'); toast('💻 ອັບເດດ Theme ເປັນ System'); setShowThemeDropdown(false); }}>
                                        <Monitor size={14} /> <span>System</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <button className="pt-logout-btn" onClick={() => {
                            if (window.confirm('ທ່ານຕ້ອງການອອກຈາກລະບົບແທ້ບໍ່?')) {
                                logout();
                            }
                        }} title="ອອກຈາກລະບົບ">
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>

                {/* Parked Orders */}
                <div className="pt-parked-section">
                    <button className="pt-parked-toggle" onClick={() => setShowParkedPanel(true)}>
                        <PauseCircle size={14} /> ບິນທີ່ພັກໄວ້ ({parkedOrders.length})
                    </button>
                </div>



                {/* Tax & Discount Options */}
                <div className="pt-tax-options">
                    <label className="pt-tax-label">ປະເພດອາກອນ (VAT):</label>
                    <div className="pt-tax-buttons">
                        <button className={`pt-tax-btn ${taxOption === 'NONE' ? 'active' : ''}`} onClick={() => setTaxOption('NONE')}>ບໍ່ຄິດ</button>
                        <button className={`pt-tax-btn ${taxOption === 'VAT_IN' ? 'active' : ''}`} onClick={() => setTaxOption('VAT_IN')}>Vat In</button>
                        <button className={`pt-tax-btn ${taxOption === 'VAT_OUT' ? 'active' : ''}`} onClick={() => setTaxOption('VAT_OUT')}>Vat Out</button>
                    </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="pt-pricing">
                    <div className="pt-pricing-row"><span>ລາຄາ:</span><span className="pt-pricing-value">₭{Math.round(subtotal).toLocaleString()}</span></div>
                    <div className="pt-pricing-row"><span>ອາກອນມູນຄ່າເພີ່ມ:</span><span className="pt-pricing-value">₭{Math.round(vatAmount).toLocaleString()}</span></div>
                    <div className="pt-pricing-row"><span>ສ່ວນຫຼຸດ:</span><span className="pt-pricing-value">₭0</span></div>
                    <div className="pt-pricing-row pt-interactive-row">
                        <span>ສ່ວນຫຼຸດທ້າຍບິນ:</span>
                        <div className="pt-discount-input-wrap">
                            <span className="pt-currency-prefix">₭</span>
                            <input 
                                type="number" 
                                className="pt-discount-input" 
                                value={billDiscount || ''} 
                                onChange={(e) => setBillDiscount(Number(e.target.value))} 
                                placeholder="0" 
                            />
                        </div>
                    </div>
                    <div className="pt-pricing-total"><span>ລວມ:</span><span className="pt-total-value">₭{Math.round(grandTotal).toLocaleString()}</span></div>
                    <CurrencyWidget totalLAK={Math.round(grandTotal)} />
                </div>

                {/* Action Buttons */}
                <div className="pt-actions">
                    <button className="pt-pay-btn" disabled={cart.items.length === 0} onClick={() => setShowPayment(true)}>💰 ຄິດເງິນ</button>
                    {showClearConfirm ? (
                        <div className="pt-cancel-confirm">
                            <button className="pt-confirm-yes" onClick={handleClearCart}>ຢືນຢັນລ້າງ</button>
                            <button className="pt-confirm-no" onClick={() => setShowClearConfirm(false)}>ຍົກເລີກ</button>
                        </div>
                    ) : (
                        <button className="pt-cancel-btn" disabled={cart.items.length === 0} onClick={() => setShowClearConfirm(true)}><X size={14} /> ຍົກເລີກ</button>
                    )}
                    <button className="pt-hold-btn" disabled={cart.items.length === 0} onClick={handleHoldOrder}><PauseCircle size={14} /> ພັກບິນ</button>
                </div>
            </aside>

            {/* Payment Modal */}
            {showPayment && <PaymentModal items={cart.items} total={Math.round(grandTotal)} onConfirm={handleCheckout} onClose={() => setShowPayment(false)} />}

            {/* Parked Orders Modal */}
            {showParkedPanel && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowParkedPanel(false); }}>
                    <div className="pt-parked-modal">
                        <div className="pt-parked-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <PauseCircle size={22} className="pt-parked-icon" />
                                <h2>ບິນທີ່ພັກໄວ້ ({parkedOrders.length})</h2>
                            </div>
                            <button className="pt-modal-close" onClick={() => setShowParkedPanel(false)}><X size={20} /></button>
                        </div>
                        <div className="pt-parked-modal-content">
                            {parkedOrders.length === 0 ? (
                                <div className="pt-empty-state">
                                    <PauseCircle size={40} className="pt-empty-icon" />
                                    <p>ຍັງບໍ່ມີບິນພັກໄວ້</p>
                                </div>
                            ) : (
                                <div className="pt-parked-grid">
                                    {parkedOrders.map((order) => (
                                        <div key={order.id} className="pt-parked-card">
                                            <div className="pt-parked-card-header">
                                                <div className="pt-parked-time"><Clock size={14} /> {formatTime(order.heldAt)}</div>
                                                <span className="pt-parked-badge">ພັກໄວ້</span>
                                            </div>
                                            <div className="pt-parked-card-body">
                                                <div className="pt-parked-detail"><strong>{order.items.length}</strong> ລາຍການ</div>
                                                <div className="pt-parked-total">₭{order.total.toLocaleString()}</div>
                                                {order.member && <div className="pt-parked-member"><User size={14} /> {order.member.name}</div>}
                                            </div>
                                            <div className="pt-parked-card-actions">
                                                <button className="pt-btn-restore" onClick={() => handleRestoreOrder(order)}>
                                                    <PlayCircle size={16} /> ດຶງຂໍ້ມູນຄືນ
                                                </button>
                                                <button className="pt-btn-discard" onClick={() => handleDiscardParked(order.id)} title="ລຶບ">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

            {/* Product Search Modal (F3) */}
            {showProductSearchModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowProductSearchModal(false); setModalSearchQuery(''); } }}>
                    <div className="pt-search-modal">
                        <div className="pt-search-modal-header">
                            <h2>🔍 ຄົ້ນຫາສິນຄ້າ (F3)</h2>
                            <button className="pt-modal-close" onClick={() => { setShowProductSearchModal(false); setModalSearchQuery(''); }}><X size={20} /></button>
                        </div>
                        <div className="pt-search-modal-body">
                            <input
                                type="text"
                                className="pt-modal-search-input"
                                placeholder="ພິມຊື່ສິນຄ້າ ຫຼື ບາໂຄ້ດເພື່ອຄົ້ນຫາ..."
                                value={modalSearchQuery}
                                onChange={(e) => setModalSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <div className="pt-modal-products-grid">
                                {products.filter(p => !modalSearchQuery.trim() || p.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) || p.barcode?.includes(modalSearchQuery)).map(p => (
                                    <div key={p.id} className="pt-modal-product-card" onClick={() => { handleAddToCart(p); }}>
                                        <div className="pt-modal-product-name">{p.name}</div>
                                        <div className="pt-modal-product-price">₭{p.price.toLocaleString()}</div>
                                        <div className="pt-modal-product-stock">ສະຕ໊ອກ: {p.stock}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Products Modal (F4) */}
            {showQuickProductsModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowQuickProductsModal(false); }}>
                    <div className="pt-search-modal">
                        <div className="pt-search-modal-header">
                            <h2>⚡ ສິນຄ້າລັດ (F4)</h2>
                            <button className="pt-modal-close" onClick={() => setShowQuickProductsModal(false)}><X size={20} /></button>
                        </div>
                        <div className="pt-search-modal-body">
                            <div className="pt-modal-products-grid">
                                {products.map(p => (
                                    <div key={p.id} className="pt-modal-product-card" onClick={() => { handleAddToCart(p); }}>
                                        <div className="pt-modal-product-name">{p.name}</div>
                                        <div className="pt-modal-product-price">₭{p.price.toLocaleString()}</div>
                                        <div className="pt-modal-product-stock">ສະຕ໊ອກ: {p.stock}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
