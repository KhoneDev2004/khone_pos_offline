'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import {
    Import, Upload, FileSpreadsheet, CheckCircle, AlertCircle,
    Download, Eye, X, ScanBarcode, Table2, Plus, Minus,
    Trash2, Package, Hash, ShoppingCart, Send, RotateCcw, Monitor
} from 'lucide-react';

// ─── Types ───────────────────────────────────────
interface PreviewRow {
    name: string;
    barcode: string;
    price: number;
    cost_price: number;
    stock: number;
    category: string;
    unit: string;
}

interface ScannedItem {
    barcode: string;
    name: string;
    currentStock: number;
    price: number;
    quantity: number;
}

// ─── Beep Sound ──────────────────────────────────
function playBeep(success: boolean) {
    try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = success ? 880 : 300;
        osc.type = success ? 'sine' : 'square';
        gain.gain.value = 0.15;
        osc.start();
        osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
    } catch { /* audio not supported */ }
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function ImportPage() {
    const [activeTab, setActiveTab] = useState<'barcode' | 'excel'>('barcode');

    const openDisplay = () => {
        window.open('/import-display', 'stock-import-display',
            'width=900,height=700,menubar=no,toolbar=no,location=no,status=no');
    };

    return (
        <POSPageWrapper
            title="ນຳເຂົ້າສິນຄ້າ"
            icon={<Import size={20} />}
            actions={
                <button className="si-display-btn" onClick={openDisplay} title="ເປີດໜ້າຈໍລູກຄ້າ">
                    <Monitor size={16} />
                    <span>ໜ້າຈໍລູກຄ້າ</span>
                </button>
            }
        >
            <div className="si-page">
                {/* Tab Header */}
                <div className="si-tabs">
                    <button
                        className={`si-tab ${activeTab === 'barcode' ? 'active' : ''}`}
                        onClick={() => setActiveTab('barcode')}
                    >
                        <ScanBarcode size={18} />
                        <span>ຍິງບາໂຄ້ດ</span>
                        <span className="si-tab-badge">ໄວ</span>
                    </button>
                    <button
                        className={`si-tab ${activeTab === 'excel' ? 'active' : ''}`}
                        onClick={() => setActiveTab('excel')}
                    >
                        <Table2 size={18} />
                        <span>ນຳເຂົ້າ Excel</span>
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'barcode' ? <BarcodeTab /> : <ExcelTab />}
            </div>
        </POSPageWrapper>
    );
}

// ═══════════════════════════════════════════════════
// BARCODE TAB
// ═══════════════════════════════════════════════════
function BarcodeTab() {
    const [items, setItems] = useState<ScannedItem[]>([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [lastAction, setLastAction] = useState<{ type: 'success' | 'error' | 'duplicate'; name?: string } | null>(null);
    const [importResult, setImportResult] = useState<{ updated: number; errors: string[] } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);

    // Initialize BroadcastChannel
    useEffect(() => {
        channelRef.current = new BroadcastChannel('stock-import-display');
        return () => { channelRef.current?.close(); };
    }, []);

    // Broadcast items to customer display whenever items change
    const broadcastItems = useCallback((newItems: ScannedItem[], action?: { type: 'add' | 'update' | 'clear' | 'imported'; barcode?: string; name?: string }) => {
        channelRef.current?.postMessage({ items: newItems, lastAction: action });
    }, []);

    // Auto-focus input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Clear action flash
    useEffect(() => {
        if (lastAction) {
            const t = setTimeout(() => setLastAction(null), 2000);
            return () => clearTimeout(t);
        }
    }, [lastAction]);

    const handleBarcodeScan = useCallback(async () => {
        const barcode = barcodeInput.trim();
        if (!barcode) return;

        // Check if already in list → +1
        const existing = items.find(i => i.barcode === barcode);
        if (existing) {
            const updatedItems = items.map(i =>
                i.barcode === barcode ? { ...i, quantity: i.quantity + 1 } : i
            );
            setItems(updatedItems);
            broadcastItems(updatedItems, { type: 'update', barcode, name: existing.name });
            setBarcodeInput('');
            setLastAction({ type: 'duplicate', name: existing.name });
            playBeep(true);
            inputRef.current?.focus();
            return;
        }

        // Lookup from API
        setLoading(true);
        try {
            const res = await fetch(`/api/stock-import?barcode=${encodeURIComponent(barcode)}`);
            const json = await res.json();

            if (json.status === 'success' && json.data) {
                const product = json.data;
                const newItem = {
                    barcode: product.barcode,
                    name: product.name,
                    currentStock: product.stock,
                    price: product.price,
                    quantity: 1,
                };
                const newItems = [newItem, ...items];
                setItems(newItems);
                broadcastItems(newItems, { type: 'add', barcode: product.barcode, name: product.name });
                setLastAction({ type: 'success', name: product.name });
                playBeep(true);
            } else {
                setLastAction({ type: 'error' });
                playBeep(false);
                toast.error(`ບໍ່ພົບສິນຄ້າ: ${barcode}`);
            }
        } catch {
            setLastAction({ type: 'error' });
            playBeep(false);
            toast.error('ເກີດຂໍ້ຜິດພາດໃນການຄົ້ນຫາ');
        }
        setLoading(false);
        setBarcodeInput('');
        inputRef.current?.focus();
    }, [barcodeInput, items, broadcastItems]);

    const updateQuantity = (barcode: string, delta: number) => {
        setItems(prev => {
            const updated = prev.map(i => {
                if (i.barcode !== barcode) return i;
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            });
            broadcastItems(updated, { type: 'update', barcode });
            return updated;
        });
    };

    const setQuantity = (barcode: string, qty: number) => {
        setItems(prev => {
            const updated = prev.map(i =>
                i.barcode === barcode ? { ...i, quantity: Math.max(1, qty) } : i
            );
            broadcastItems(updated, { type: 'update', barcode });
            return updated;
        });
    };

    const removeItem = (barcode: string) => {
        setItems(prev => {
            const updated = prev.filter(i => i.barcode !== barcode);
            broadcastItems(updated, { type: 'update' });
            return updated;
        });
    };

    const clearAll = () => {
        setItems([]);
        setImportResult(null);
        broadcastItems([], { type: 'clear' });
        inputRef.current?.focus();
    };

    const handleImport = async () => {
        if (items.length === 0) { toast.error('ບໍ່ມີລາຍການ'); return; }
        setImporting(true);
        setImportResult(null);
        try {
            const res = await fetch('/api/stock-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(i => ({ barcode: i.barcode, quantity: i.quantity }))
                }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                setImportResult(json.data);
                toast.success(`ນຳເຂົ້າສຳເລັດ ${json.data.updated} ລາຍການ!`);
                if (json.data.errors.length === 0) {
                    setItems([]);
                    broadcastItems([], { type: 'imported' });
                }
            } else {
                toast.error(json.message || 'ນຳເຂົ້າລົ້ມເຫຼວ');
            }
        } catch {
            toast.error('ນຳເຂົ້າລົ້ມເຫຼວ');
        }
        setImporting(false);
        inputRef.current?.focus();
    };

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <div className="si-barcode-tab">
            {/* Barcode Input Area */}
            <div className={`si-scan-card ${lastAction?.type === 'success' ? 'flash-success' : ''} ${lastAction?.type === 'duplicate' ? 'flash-duplicate' : ''} ${lastAction?.type === 'error' ? 'flash-error' : ''}`}>
                <div className="si-scan-header">
                    <div className="si-scan-icon">
                        <ScanBarcode size={24} />
                    </div>
                    <div>
                        <h3>ສະແກນ ຫຼື ພິມບາໂຄ້ດ</h3>
                        <p>ຍິງບາໂຄ້ດ ຫຼື ພິມລະຫັດແລ້ວກົດ Enter ເພື່ອເພີ່ມສິນຄ້າ</p>
                    </div>
                </div>

                <div className="si-scan-input-wrap">
                    <ScanBarcode size={20} className="si-scan-input-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="si-scan-input"
                        placeholder="ພິມບາໂຄ້ດ ແລ້ວກົດ Enter..."
                        value={barcodeInput}
                        onChange={e => setBarcodeInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleBarcodeScan(); }}
                        disabled={loading}
                        autoComplete="off"
                    />
                    {loading && <div className="si-scan-spinner" />}
                    {barcodeInput && !loading && (
                        <button className="si-scan-clear" onClick={() => { setBarcodeInput(''); inputRef.current?.focus(); }}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Action Flash */}
                {lastAction && (
                    <div className={`si-flash si-flash-${lastAction.type}`}>
                        {lastAction.type === 'success' && <><CheckCircle size={16} /> ເພີ່ມແລ້ວ: {lastAction.name}</>}
                        {lastAction.type === 'duplicate' && <><Plus size={16} /> +1: {lastAction.name}</>}
                        {lastAction.type === 'error' && <><AlertCircle size={16} /> ບໍ່ພົບສິນຄ້ານີ້</>}
                    </div>
                )}
            </div>

            {/* Items Table */}
            {items.length > 0 && (
                <div className="si-items-card">
                    <div className="si-items-header">
                        <h3><ShoppingCart size={18} /> ລາຍການນຳເຂົ້າ ({items.length} ລາຍການ)</h3>
                        <button className="si-clear-btn" onClick={clearAll}>
                            <RotateCcw size={14} /> ລ້າງທັງໝົດ
                        </button>
                    </div>

                    <div className="si-items-scroll">
                        <table className="si-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>#</th>
                                    <th>ສິນຄ້າ</th>
                                    <th style={{ width: 130 }}>ບາໂຄ້ດ</th>
                                    <th style={{ width: 100 }}>Stock ປັດຈຸບັນ</th>
                                    <th style={{ width: 180 }}>ຈຳນວນນຳເຂົ້າ</th>
                                    <th style={{ width: 60 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.barcode} className="si-item-row">
                                        <td className="si-item-num">{idx + 1}</td>
                                        <td>
                                            <div className="si-item-name">{item.name}</div>
                                            <div className="si-item-price">{item.price.toLocaleString()} ₭</div>
                                        </td>
                                        <td className="si-item-barcode">{item.barcode}</td>
                                        <td>
                                            <span className="si-current-stock">
                                                <Package size={13} /> {item.currentStock}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="si-qty-control">
                                                <button
                                                    className="si-qty-btn minus"
                                                    onClick={() => updateQuantity(item.barcode, -1)}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="si-qty-input"
                                                    value={item.quantity}
                                                    onChange={e => setQuantity(item.barcode, parseInt(e.target.value) || 1)}
                                                    min={1}
                                                />
                                                <button
                                                    className="si-qty-btn plus"
                                                    onClick={() => updateQuantity(item.barcode, 1)}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <button className="si-remove-btn" onClick={() => removeItem(item.barcode)}>
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Footer */}
                    <div className="si-summary">
                        <div className="si-summary-stats">
                            <div className="si-stat">
                                <Hash size={15} />
                                <span>{items.length} ລາຍການ</span>
                            </div>
                            <div className="si-stat highlight">
                                <Package size={15} />
                                <span>ລວມ {totalItems} ໜ່ວຍ</span>
                            </div>
                        </div>
                        <button
                            className="si-import-btn"
                            onClick={handleImport}
                            disabled={importing || items.length === 0}
                        >
                            {importing ? (
                                <><div className="si-btn-spinner" /> ກຳລັງນຳເຂົ້າ...</>
                            ) : (
                                <><Send size={16} /> ຢືນຢັນນຳເຂົ້າ</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Import Result */}
            {importResult && (
                <div className="si-result-card">
                    <div className="si-result-success">
                        <CheckCircle size={20} />
                        <span>ອັບເດດສຳເລັດ {importResult.updated} ລາຍການ</span>
                    </div>
                    {importResult.errors.length > 0 && (
                        <div className="si-result-errors">
                            <div className="si-result-error-title">
                                <AlertCircle size={16} /> ຂໍ້ຜິດພາດ {importResult.errors.length} ລາຍການ
                            </div>
                            {importResult.errors.map((err, i) => (
                                <div key={i} className="si-result-error-item">{err}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {items.length === 0 && !importResult && (
                <div className="si-empty">
                    <ScanBarcode size={48} strokeWidth={1} />
                    <h4>ຍັງບໍ່ມີລາຍການ</h4>
                    <p>ຍິງບາໂຄ້ດ ຫຼື ພິມລະຫັດບາໂຄ້ດໃນຊ່ອງຂ້າງເທິງ<br />ເພື່ອເລີ່ມຕົ້ນນຳເຂົ້າສິນຄ້າ</p>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// EXCEL TAB (existing functionality preserved)
// ═══════════════════════════════════════════════════
function ExcelTab() {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState<PreviewRow[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [result, setResult] = useState<{ imported: number; updated: number; errors: string[] } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (f: File) => {
        setFile(f);
        setResult(null);
        try {
            const XLSX = await import('xlsx');
            const buffer = await f.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
            const previewData: PreviewRow[] = rows.slice(0, 20).map(r => ({
                name: String(r.name || r.Name || r['ຊື່'] || ''),
                barcode: String(r.barcode || r.Barcode || r['ບາໂຄດ'] || ''),
                price: Number(r.price || r.Price || r['ລາຄາ'] || 0),
                cost_price: Number(r.cost_price || r.CostPrice || r['ລາຄາທຶນ'] || 0),
                stock: Number(r.stock || r.Stock || r['ສະຕ໊ອກ'] || 0),
                category: String(r.category || r.Category || r['ໝວດ'] || ''),
                unit: String(r.unit || r.Unit || r['ໜ່ວຍ'] || ''),
            }));
            setPreview(previewData);
            setShowPreview(true);
        } catch { /* ignore preview error */ }
    };

    const handleImport = async () => {
        if (!file) { toast.error('ກະລຸນາເລືອກໄຟລ໌'); return; }
        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/import', { method: 'POST', body: formData });
            const json = await res.json();
            if (json.status === 'success') {
                setResult(json.data);
                toast.success(`ນຳເຂົ້າສຳເລັດ! ${json.data.imported} ລາຍການ`);
                setShowPreview(false);
            } else { toast.error(json.message); }
        } catch { toast.error('ນຳເຂົ້າລົ້ມເຫຼວ'); }
        setImporting(false);
    };

    const downloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');
            const data = [
                { name: 'ນ້ຳດື່ມ 500ml', barcode: '8851234567890', price: 5000, cost_price: 3000, stock: 100, category: 'ເຄື່ອງດື່ມ', unit: 'ຂວດ' },
                { name: 'ເຂົ້າໜຽວ 1kg', barcode: '8851234567891', price: 15000, cost_price: 10000, stock: 50, category: 'ອາຫານ', unit: 'ຖົງ' },
                { name: 'ສະບູ', barcode: '', price: 8000, cost_price: 5000, stock: 30, category: 'ເຄື່ອງໃຊ້', unit: 'ກ້ອນ' },
            ];
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Products');
            ws['!cols'] = [
                { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 12 },
                { wch: 8 }, { wch: 14 }, { wch: 10 }
            ];
            XLSX.writeFile(wb, 'product_import_template.xlsx');
            toast.success('ດາວໂຫຼດສຳເລັດ');
        } catch { toast.error('ດາວໂຫຼດລົ້ມເຫຼວ'); }
    };

    return (
        <div className="si-excel-tab">
            {/* Main Import Card */}
            <div className="imp-card">
                <div className="imp-header">
                    <FileSpreadsheet size={48} strokeWidth={1.2} />
                    <h2>ນຳເຂົ້າສິນຄ້າຈາກ Excel</h2>
                    <p>ອັບໂຫຼດໄຟລ໌ .xlsx ເພື່ອເພີ່ມ ຫຼື ອັບເດດສິນຄ້າ</p>
                </div>

                <button className="imp-template-btn" onClick={downloadTemplate}>
                    <Download size={16} />
                    ດາວໂຫຼດແບບຟອມຕົວຢ່າງ Excel
                </button>

                <div className="imp-upload-area" onClick={() => fileRef.current?.click()}>
                    <Upload size={32} />
                    <span>{file ? file.name : 'ຄລິກ ຫຼື ລາກໄຟລ໌ (.xlsx) ມາວາງທີ່ນີ້'}</span>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileSelect(f);
                        }}
                    />
                </div>

                <div className="imp-actions">
                    {file && (
                        <button className="btn btn-sm btn-secondary" onClick={() => { setShowPreview(!showPreview); }}>
                            <Eye size={14} /> {showPreview ? 'ເຊື່ອງ' : 'ເບິ່ງ'}ຕົວຢ່າງ
                        </button>
                    )}
                    <button className="btn btn-success" onClick={handleImport} disabled={!file || importing} style={{ flex: 1 }}>
                        {importing ? 'ກຳລັງນຳເຂົ້າ...' : '📥 ເລີ່ມນຳເຂົ້າ'}
                    </button>
                </div>

                {result && (
                    <div className="imp-result">
                        <div className="imp-result-row success"><CheckCircle size={16} /> ນຳເຂົ້າໃໝ່: {result.imported} ລາຍການ</div>
                        <div className="imp-result-row success"><CheckCircle size={16} /> ອັບເດດ: {result.updated} ລາຍການ</div>
                        {result.errors.length > 0 && (
                            <div className="imp-result-errors">
                                <div className="imp-result-row error"><AlertCircle size={16} /> ຂໍ້ຜິດພາດ: {result.errors.length}</div>
                                {result.errors.slice(0, 5).map((err, i) => <div key={i} className="imp-error-item">{err}</div>)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Preview Table */}
            {showPreview && preview.length > 0 && (
                <div className="imp-preview">
                    <div className="imp-preview-header">
                        <h3>👁️ ຕົວຢ່າງຂໍ້ມູນ (20 ແຖວທຳອິດ)</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => setShowPreview(false)}><X size={14} /></button>
                    </div>
                    <div className="imp-preview-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th><th>ຊື່ສິນຄ້າ</th><th>ບາໂຄ້ດ</th><th>ລາຄາຂາຍ</th>
                                    <th>ລາຄາທຶນ</th><th>ສະຕ໊ອກ</th><th>ໝວດໝູ່</th><th>ໜ່ວຍ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((r, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{r.name || <span style={{ color: 'var(--accent-danger)' }}>ບໍ່ມີຊື່</span>}</td>
                                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.barcode || '-'}</td>
                                        <td style={{ color: '#4fc3f7', fontWeight: 600 }}>{r.price.toLocaleString()}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.cost_price.toLocaleString()}</td>
                                        <td>{r.stock}</td>
                                        <td><span className="badge badge-info">{r.category || '-'}</span></td>
                                        <td>{r.unit || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Format Guide */}
            <div className="imp-guide">
                <h3>📋 ຄໍລຳທີ່ຮອງຮັບ</h3>
                <table className="data-table">
                    <thead><tr><th>Column</th><th>ຄຳອະທິບາຍ</th><th>ຈຳເປັນ</th></tr></thead>
                    <tbody>
                        <tr><td><code>name</code></td><td>ຊື່ສິນຄ້າ</td><td>✅</td></tr>
                        <tr><td><code>barcode</code></td><td>ບາໂຄ້ດ</td><td>❌</td></tr>
                        <tr><td><code>price</code></td><td>ລາຄາຂາຍ (ກີບ)</td><td>✅</td></tr>
                        <tr><td><code>cost_price</code></td><td>ລາຄາທຶນ (ກີບ)</td><td>❌</td></tr>
                        <tr><td><code>stock</code></td><td>ຈຳນວນສະຕ໊ອກ</td><td>❌</td></tr>
                        <tr><td><code>category</code></td><td>ໝວດໝູ່</td><td>❌</td></tr>
                        <tr><td><code>unit</code></td><td>ໜ່ວຍ</td><td>❌</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
