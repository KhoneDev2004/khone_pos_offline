'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import ConfirmModal from '@/app/components/ConfirmModal';
import { Package, Plus, Search, Edit, Trash2, X, DollarSign, TrendingUp, Wand2, AlertTriangle, XCircle, Filter } from 'lucide-react';

interface Product { id: number; name: string; barcode: string; price: number; cost_price: number; stock: number; category: string; unit: string; }

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<{ name: string }[]>([]);
    const [units, setUnits] = useState<{ name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', barcode: '', price: '', cost_price: '', stock: '', category: '', unit: '' });
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

    const LOW_STOCK_THRESHOLD = 10;

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/products?limit=1000${search ? `&search=${search}` : ''}`);
            const json = await res.json();
            if (json.status === 'success') setProducts(json.data.products);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    };

    const fetchMeta = async () => {
        try {
            const [catRes, unitRes] = await Promise.all([fetch('/api/categories'), fetch('/api/units')]);
            const [catJson, unitJson] = await Promise.all([catRes.json(), unitRes.json()]);
            if (catJson.status === 'success') setCategories(catJson.data.categories);
            if (unitJson.status === 'success') setUnits(unitJson.data.units);
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchProducts(); }, [search]);
    useEffect(() => { fetchMeta(); }, []);

    // Generate EAN-13 barcode
    const generateBarcode = (): string => {
        const prefix = '200';
        const random = String(Math.floor(Math.random() * 1000000000)).padStart(9, '0');
        const digits = (prefix + random).slice(0, 12);
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const check = (10 - (sum % 10)) % 10;
        return digits + check;
    };

    const openAdd = () => {
        setEditProduct(null);
        setForm({ name: '', barcode: generateBarcode(), price: '', cost_price: '', stock: '', category: '', unit: '' });
        setShowModal(true);
    };

    const openEdit = (p: Product) => {
        setEditProduct(p);
        setForm({
            name: p.name, barcode: p.barcode || '', price: String(p.price),
            cost_price: String(p.cost_price || 0), stock: String(p.stock),
            category: p.category || '', unit: p.unit || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.price) { toast.error('ກະລຸນາປ້ອນຊື່ ແລະ ລາຄາ'); return; }
        try {
            const body = {
                name: form.name, barcode: form.barcode,
                price: Number(form.price), cost_price: Number(form.cost_price || 0),
                stock: Number(form.stock || 0), category: form.category, unit: form.unit
            };
            const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
            const method = editProduct ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success(editProduct ? 'ແກ້ໄຂສຳເລັດ' : 'ເພີ່ມສຳເລັດ');
                setShowModal(false);
                fetchProducts();
            } else toast.error(json.message);
        } catch { toast.error('ບັນທຶກລົ້ມເຫຼວ'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.status === 'success') { toast.success('ລຶບສຳເລັດ'); fetchProducts(); }
            else toast.error(json.message);
        } catch { toast.error('ລຶບລົ້ມເຫຼວ'); }
        setDeleteTarget(null);
    };

    const profit = (p: Product) => p.price - (p.cost_price || 0);

    // Filtered products
    const filteredProducts = products.filter(p => {
        if (catFilter !== 'all' && p.category !== catFilter) return false;
        if (stockFilter === 'low' && p.stock > LOW_STOCK_THRESHOLD) return false;
        if (stockFilter === 'out' && p.stock > 0) return false;
        return true;
    });

    // Stats
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
    const outOfStockCount = products.filter(p => p.stock <= 0).length;

    // Unique categories from products for filter
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

    return (
        <POSPageWrapper title="ສິນຄ້າ" icon={<Package size={20} />} onRefresh={fetchProducts}
            actions={<button className="btn btn-sm btn-success" onClick={openAdd}><Plus size={14} /> ເພີ່ມສິນຄ້າ</button>}>

            {/* Stock Alerts */}
            {(lowStockCount > 0 || outOfStockCount > 0) && (
                <div className="prod-alerts">
                    {outOfStockCount > 0 && (
                        <div className="prod-alert danger" onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}>
                            <XCircle size={16} />
                            <span>ສິນຄ້າໝົດ: <strong>{outOfStockCount}</strong> ລາຍການ — ບໍ່ສາມາດຂາຍໄດ້!</span>
                        </div>
                    )}
                    {lowStockCount > 0 && (
                        <div className="prod-alert warning" onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}>
                            <AlertTriangle size={16} />
                            <span>ສິນຄ້າໃກ້ໝົດ (≤{LOW_STOCK_THRESHOLD}): <strong>{lowStockCount}</strong> ລາຍການ — ກະລຸນາເຕີມສະຕ໊ອກ</span>
                        </div>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="pos-page-filters">
                <div className="pos-search-wrapper" style={{ maxWidth: 350 }}>
                    <Search size={18} className="pos-search-icon" />
                    <input type="text" className="pos-search-input" placeholder="ຄົ້ນຫາ ຊື່ ຫຼື ບາໂຄ້ດ..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    {search && <button className="pos-search-clear" onClick={() => setSearch('')}><X size={16} /></button>}
                </div>

                {/* Category filter */}
                <div className="prod-filter-group">
                    <Filter size={14} />
                    <select className="prod-filter-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                        <option value="all">ທຸກໝວດ ({products.length})</option>
                        {uniqueCategories.map(c => (
                            <option key={c} value={c}>{c} ({products.filter(p => p.category === c).length})</option>
                        ))}
                    </select>
                </div>

                {/* Stock filter buttons */}
                <div className="prod-stock-filters">
                    <button className={`hist-filter-btn sm ${stockFilter === 'all' ? 'active' : ''}`} onClick={() => setStockFilter('all')}>
                        ທັງໝົດ
                    </button>
                    <button className={`hist-filter-btn sm ${stockFilter === 'low' ? 'active' : ''}`}
                        onClick={() => setStockFilter('low')} style={lowStockCount > 0 ? { borderColor: '#f59e0b' } : {}}>
                        ⚠️ ໃກ້ໝົດ ({lowStockCount})
                    </button>
                    <button className={`hist-filter-btn sm ${stockFilter === 'out' ? 'active' : ''}`}
                        onClick={() => setStockFilter('out')} style={outOfStockCount > 0 ? { borderColor: '#ef4444' } : {}}>
                        ❌ ໝົດ ({outOfStockCount})
                    </button>
                </div>

                <div className="pos-filter-info">{filteredProducts.length} / {products.length} ລາຍການ</div>
            </div>

            <div className="pos-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th><th>ຊື່ສິນຄ້າ</th><th>ບາໂຄ້ດ</th><th>ໝວດໝູ່</th>
                            <th>ລາຄາທຶນ</th><th>ລາຄາຂາຍ</th><th>ກຳໄລ</th>
                            <th>ສະຕ໊ອກ</th><th>ຈັດການ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ກຳລັງໂຫຼດ...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ບໍ່ມີຂໍ້ມູນ</td></tr>
                        ) : filteredProducts.map((p) => (
                            <tr key={p.id} className={p.stock <= 0 ? 'prod-row-danger' : p.stock <= LOW_STOCK_THRESHOLD ? 'prod-row-warning' : ''}>
                                <td>{p.id}</td>
                                <td style={{ fontWeight: 600 }}>
                                    {p.name}
                                    {p.stock <= 0 && <span className="prod-stock-tag danger">ໝົດ</span>}
                                    {p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD && <span className="prod-stock-tag warning">ໃກ້ໝົດ</span>}
                                </td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{p.barcode || '-'}</td>
                                <td><span className="badge badge-info">{p.category || '-'}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{(p.cost_price || 0).toLocaleString()}</td>
                                <td style={{ fontWeight: 700, color: '#4fc3f7' }}>{p.price.toLocaleString()}</td>
                                <td style={{ fontWeight: 700, color: profit(p) > 0 ? '#22c55e' : '#ef4444' }}>
                                    {profit(p).toLocaleString()}
                                </td>
                                <td>
                                    <span className={`badge ${p.stock <= 0 ? 'badge-danger' : p.stock <= LOW_STOCK_THRESHOLD ? 'badge-warning' : 'badge-success'}`}>
                                        {p.stock}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex gap-2">
                                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}><Edit size={14} /></button>
                                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(p)}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <h2 className="modal-title">{editProduct ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າ'}</h2>
                        <div className="form-group">
                            <label className="form-label">ຊື່ສິນຄ້າ *</label>
                            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ບາໂຄ້ດ</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="form-input" value={form.barcode}
                                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                    style={{ flex: 1, fontFamily: 'monospace' }} />
                                <button className="btn btn-sm btn-secondary" type="button"
                                    onClick={() => setForm({ ...form, barcode: generateBarcode() })}
                                    title="ສ້າງບາໂຄ້ດອັດຕະໂນມັດ"
                                    style={{ whiteSpace: 'nowrap' }}>
                                    <Wand2 size={14} /> ສ້າງໃໝ່
                                </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                ✨ ບາໂຄ້ດຖືກສ້າງອັດຕະໂນມັດ — ຫຼືປ້ອນເອງ
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label"><DollarSign size={12} style={{ display: 'inline' }} /> ລາຄາທຶນ</label>
                                <input type="number" className="form-input" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label"><TrendingUp size={12} style={{ display: 'inline' }} /> ລາຄາຂາຍ *</label>
                                <input type="number" className="form-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                            </div>
                        </div>
                        {form.price && form.cost_price && (
                            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                                ກຳໄລ: {(Number(form.price) - Number(form.cost_price)).toLocaleString()} ກີບ ({form.cost_price && Number(form.cost_price) > 0 ? ((Number(form.price) - Number(form.cost_price)) / Number(form.cost_price) * 100).toFixed(1) : '0'}%)
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">ສະຕ໊ອກ</label>
                            <input type="number" className="form-input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">ໝວດໝູ່</label>
                                <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    <option value="">-- ເລືອກ --</option>
                                    {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">ໜ່ວຍ</label>
                                <select className="form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                                    <option value="">-- ເລືອກ --</option>
                                    {units.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>ຍົກເລີກ</button>
                            <button className="btn btn-success" onClick={handleSave}>{editProduct ? 'ບັນທຶກ' : 'ເພີ່ມ'}</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                type="delete"
                message={`ທ່ານຕ້ອງການລຶບສິນຄ້າ "${deleteTarget?.name}" ແທ້ບໍ?`}
                detail={deleteTarget ? `ບາໂຄ້ດ: ${deleteTarget.barcode || '-'} | ສະຕ໊ອກ: ${deleteTarget.stock} | ລາຄາ: ${deleteTarget.price.toLocaleString()} ກີບ` : undefined}
                confirmText="🗑️ ລຶບສິນຄ້າ"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </POSPageWrapper>
    );
}
