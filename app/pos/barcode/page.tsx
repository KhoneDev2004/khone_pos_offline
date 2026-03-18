'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import ConfirmModal from '@/app/components/ConfirmModal';
import { Barcode, Plus, Printer, RefreshCw, Search, X, Wand2, Download } from 'lucide-react';

interface Product { id: number; name: string; barcode: string; price: number; category: string; }

export default function BarcodePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'no_barcode' | 'all'>('no_barcode');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [manualBarcode, setManualBarcode] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [confirmAutoAssign, setConfirmAutoAssign] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/products?limit=9999');
            const json = await res.json();
            if (json.status === 'success') setProducts(json.data.products);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    };

    useEffect(() => { fetchProducts(); }, []);

    const generateBarcode = (): string => {
        // Generate EAN-13 compatible barcode
        const prefix = '200'; // Internal use prefix
        const random = String(Math.floor(Math.random() * 1000000000)).padStart(9, '0');
        const digits = (prefix + random).slice(0, 12);
        // Calculate check digit
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const check = (10 - (sum % 10)) % 10;
        return digits + check;
    };

    const assignBarcode = async (productId: number, barcode: string) => {
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success('ບັນທຶກບາໂຄ້ດສຳເລັດ');
                fetchProducts();
                setEditingId(null);
                setManualBarcode('');
            } else toast.error(json.message);
        } catch { toast.error('ບັນທຶກລົ້ມເຫຼວ'); }
    };

    const autoAssignBarcode = async (productId: number) => {
        const barcode = generateBarcode();
        await assignBarcode(productId, barcode);
    };

    const handleConfirmAutoAssign = async () => {
        setConfirmAutoAssign(false);
        const noBarcode = filteredProducts.filter(p => !p.barcode);
        if (noBarcode.length === 0) { toast.error('ບໍ່ມີສິນຄ້າທີ່ຕ້ອງການບາໂຄ້ດ'); return; }
        
        for (const p of noBarcode) {
            const barcode = generateBarcode();
            try {
                await fetch(`/api/products/${p.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ barcode }),
                });
            } catch { /* continue */ }
        }
        toast.success(`ສ້າງບາໂຄ້ດ ${noBarcode.length} ສິນຄ້າສຳເລັດ`);
        fetchProducts();
    };

    const autoAssignAllClick = () => {
        const noBarcode = filteredProducts.filter(p => !p.barcode);
        if (noBarcode.length === 0) { toast.error('ບໍ່ມີສິນຄ້າທີ່ຕ້ອງການບາໂຄ້ດ'); return; }
        setConfirmAutoAssign(true);
    };

    const printBarcodes = (productsToPrint: Product[]) => {
        const printWindow = window.open('', '_blank', 'width=600,height=800');
        if (!printWindow) { toast.error('ບໍ່ສາມາດເປີດໜ້າປີ້ນ'); return; }

        const labelsHtml = productsToPrint.filter(p => p.barcode).map(p => `
            <div style="display:inline-block;text-align:center;padding:10px;margin:5px;border:1px dashed #ccc;border-radius:6px;">
                <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">${p.name}</div>
                <div style="font-size:10px;color:#666;margin-bottom:2px;">${p.price.toLocaleString()} ກີບ</div>
                <div id="bc-${p.id}"></div>
                <div style="font-family:monospace;font-size:14px;letter-spacing:2px;margin-top:4px;">${p.barcode}</div>
            </div>
        `).join('');

        printWindow.document.write(`
<!DOCTYPE html><html><head><title>ປິ້ນບາໂຄ້ດ</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
    @page { margin: 10mm; }
    body { font-family: Arial, sans-serif; }
</style></head>
<body>${labelsHtml}
<script>
    ${productsToPrint.filter(p => p.barcode).map(p => `
        try { JsBarcode("#bc-${p.id}", "${p.barcode}", { width: 1.5, height: 40, displayValue: false, format: "EAN13" }); } catch(e) {}
    `).join('\n')}
    setTimeout(function() { window.print(); }, 800);
<\/script></body></html>`);
        printWindow.document.close();
    };

    const filteredProducts = products.filter(p => {
        if (filter === 'no_barcode' && p.barcode) return false;
        if (search) {
            const term = search.toLowerCase();
            return p.name.toLowerCase().includes(term) || (p.barcode || '').includes(term);
        }
        return true;
    });

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const noBarcodeCount = products.filter(p => !p.barcode).length;

    return (
        <POSPageWrapper title="ສ້າງບາໂຄ້ດ" icon={<Barcode size={20} />} onRefresh={fetchProducts}
            actions={
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <button className="btn btn-sm btn-success" onClick={() => printBarcodes(products.filter(p => selectedIds.includes(p.id)))}>
                            <Printer size={14} /> ປິ້ນ ({selectedIds.length})
                        </button>
                    )}
                    <button className="btn btn-sm btn-success" onClick={autoAssignAllClick}>
                        <Wand2 size={14} /> ສ້າງອັດຕະໂນມັດ ({noBarcodeCount})
                    </button>
                </div>
            }>

            {/* Filter Bar */}
            <div className="pos-page-filters">
                <div className="hist-quick-filters">
                    <button className={`hist-filter-btn ${filter === 'no_barcode' ? 'active' : ''}`}
                        onClick={() => setFilter('no_barcode')}>
                        ❌ ບໍ່ມີບາໂຄ້ດ ({noBarcodeCount})
                    </button>
                    <button className={`hist-filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}>
                        📋 ທັງໝົດ ({products.length})
                    </button>
                </div>
                <div className="pos-search-wrapper" style={{ maxWidth: 300 }}>
                    <Search size={18} className="pos-search-icon" />
                    <input type="text" className="pos-search-input" placeholder="ຄົ້ນຫາ..."
                        value={search} onChange={(e) => setSearch(e.target.value)} />
                    {search && <button className="pos-search-clear" onClick={() => setSearch('')}><X size={16} /></button>}
                </div>
            </div>

            {/* Products Grid */}
            <div className="bc-products-grid">
                {loading ? (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>ກຳລັງໂຫຼດ...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                        <div className="empty-state-icon">🎉</div>
                        <div className="empty-state-text">ທຸກສິນຄ້າມີບາໂຄ້ດແລ້ວ!</div>
                    </div>
                ) : (
                    filteredProducts.map(p => (
                        <div key={p.id} className="bc-product-card">
                            <input type="checkbox" checked={selectedIds.includes(p.id)}
                                onChange={() => toggleSelect(p.id)}
                                style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }} />
                            <div className="bc-product-info">
                                <div className="bc-product-name">{p.name}</div>
                                <div className="bc-product-barcode">
                                    {p.barcode ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Barcode size={12} /> {p.barcode}
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--accent-danger)' }}>❌ ບໍ່ມີບາໂຄ້ດ</span>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.price.toLocaleString()} ກີບ • {p.category || '-'}</div>
                            </div>
                            <div className="bc-product-actions">
                                {editingId === p.id ? (
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <input type="text" className="form-input" value={manualBarcode}
                                            onChange={(e) => setManualBarcode(e.target.value)}
                                            placeholder="ບາໂຄ້ດ" style={{ width: 130, padding: '4px 8px', fontSize: 12 }} />
                                        <button className="btn btn-sm btn-success" onClick={() => assignBarcode(p.id, manualBarcode)}>✓</button>
                                        <button className="btn btn-sm btn-secondary" onClick={() => { setEditingId(null); setManualBarcode(''); }}>✗</button>
                                    </div>
                                ) : (
                                    <>
                                        <button className="btn btn-sm btn-secondary" title="ປ້ອນເອງ"
                                            onClick={() => { setEditingId(p.id); setManualBarcode(p.barcode || ''); }}>
                                            ✏️
                                        </button>
                                        {!p.barcode && (
                                            <button className="btn btn-sm btn-success" title="ສ້າງອັດຕະໂນມັດ"
                                                onClick={() => autoAssignBarcode(p.id)}>
                                                <Wand2 size={14} />
                                            </button>
                                        )}
                                        {p.barcode && (
                                            <button className="btn btn-sm btn-success" title="ປິ້ນ"
                                                onClick={() => printBarcodes([p])}>
                                                <Printer size={14} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmModal
                isOpen={confirmAutoAssign}
                type="info"
                message={`ຢືນຢັນການສ້າງບາໂຄ້ດອັດຕະໂນມັດ?`}
                detail={`ລະບົບຈະສ້າງບາໂຄ້ດໃຫ້ກັບ ${filteredProducts.filter(p => !p.barcode).length} ສິນຄ້າທີ່ຍັງບໍ່ມີບາໂຄ້ດ`}
                confirmText="✨ ສ້າງບາໂຄ້ດ"
                onConfirm={handleConfirmAutoAssign}
                onCancel={() => setConfirmAutoAssign(false)}
            />
        </POSPageWrapper>
    );
}
