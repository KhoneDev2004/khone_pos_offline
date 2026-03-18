'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import ConfirmModal from '@/app/components/ConfirmModal';
import { Gift, Plus, Edit, Trash2, Percent, Tag, ShoppingBag, Users, Star, Clock, Award, Package, Zap, Crown } from 'lucide-react';

interface Promotion {
    id: number; name: string; description: string;
    type: string; discount_type: string; discount_value: number;
    min_purchase: number; min_quantity: number;
    buy_quantity: number; get_quantity: number;
    applicable_products: string; applicable_categories: string;
    member_only: number; member_tier: string;
    max_uses: number; used_count: number;
    points_required: number;
    start_date: string; end_date: string;
    active: number; created_at: string;
}

const PROMO_TYPES = [
    { key: 'percent_discount', label: '💰 ສ່ວນຫຼຸດເປີເຊັນ', desc: 'ຫຼຸດລາຄາຕາມເປີເຊັນ ເຊັ່ນ: ຫຼຸດ 10%', icon: '💰' },
    { key: 'fixed_discount', label: '🏷️ ສ່ວນຫຼຸດຈຳນວນຄົງທີ່', desc: 'ຫຼຸດລາຄາເປັນຈຳນວນເງິນ ເຊັ່ນ: ຫຼຸດ 5,000 ກີບ', icon: '🏷️' },
    { key: 'min_purchase', label: '🛒 ຊື້ຄົບຕາມຍອດ', desc: 'ຊື້ຄົບຕາມຍອດ ຈະໄດ້ສ່ວນຫຼຸດ ເຊັ່ນ: ຊື້ຄົບ 100,000 ກີບ ຫຼຸດ 10%', icon: '🛒' },
    { key: 'buy_x_get_y', label: '🎁 ຊື້ X ແຖມ Y', desc: 'ຊື້ສິນຄ້າຄົບຈຳນວນ ຈະໄດ້ແຖມ ເຊັ່ນ: ຊື້ 2 ແຖມ 1', icon: '🎁' },
    { key: 'member_discount', label: '👥 ສ່ວນຫຼຸດສະມາຊິກ', desc: 'ສ່ວນຫຼຸດສະເພາະສະມາຊິກ ຕາມລະດັບ', icon: '👥' },
    { key: 'points_redeem', label: '⭐ ແລກຄະແນນ', desc: 'ໃຊ້ຄະແນນສະສົມແລກສ່ວນຫຼຸດ', icon: '⭐' },
    { key: 'time_limited', label: '⏰ ໂປຣໂມຊັ່ນຕາມເວລາ', desc: 'ໂປຣໂມຊັ່ນມີກຳນົດເວລາ ເຊັ່ນ: Happy Hour', icon: '⏰' },
    { key: 'quantity_discount', label: '📦 ຊື້ຫຼາຍ ຫຼຸດຫຼາຍ', desc: 'ຊື້ຈຳນວນຫຼາຍ ໄດ້ສ່ວນຫຼຸດ ເຊັ່ນ: ຊື້ 3 ຊິ້ນ ຫຼຸດ 15%', icon: '📦' },
];

const DEFAULT_FORM = {
    name: '', description: '', type: 'percent_discount',
    discount_type: 'percent', discount_value: '',
    min_purchase: '', min_quantity: '',
    buy_quantity: '', get_quantity: '',
    applicable_products: '', applicable_categories: '',
    member_only: false, member_tier: '',
    max_uses: '', points_required: '',
    start_date: '', end_date: '',
};

export default function BonusPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editPromo, setEditPromo] = useState<Promotion | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);

    const fetchPromotions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/promotions');
            const json = await res.json();
            if (json.status === 'success') setPromotions(json.data.promotions);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    };

    useEffect(() => { fetchPromotions(); }, []);

    const openAdd = (type?: string) => {
        setEditPromo(null);
        setForm({ ...DEFAULT_FORM, type: type || 'percent_discount' });
        setShowModal(true);
    };

    const openEdit = (p: Promotion) => {
        setEditPromo(p);
        setForm({
            name: p.name, description: p.description, type: p.type,
            discount_type: p.discount_type, discount_value: String(p.discount_value || ''),
            min_purchase: String(p.min_purchase || ''), min_quantity: String(p.min_quantity || ''),
            buy_quantity: String(p.buy_quantity || ''), get_quantity: String(p.get_quantity || ''),
            applicable_products: p.applicable_products, applicable_categories: p.applicable_categories,
            member_only: !!p.member_only, member_tier: p.member_tier,
            max_uses: String(p.max_uses || ''), points_required: String(p.points_required || ''),
            start_date: p.start_date, end_date: p.end_date,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('ກະລຸນາປ້ອນຊື່ໂປຣໂມຊັ່ນ'); return; }
        try {
            const payload = {
                ...(editPromo ? { id: editPromo.id } : {}),
                name: form.name, description: form.description, type: form.type,
                discount_type: form.discount_type, discount_value: Number(form.discount_value) || 0,
                min_purchase: Number(form.min_purchase) || 0, min_quantity: Number(form.min_quantity) || 0,
                buy_quantity: Number(form.buy_quantity) || 0, get_quantity: Number(form.get_quantity) || 0,
                applicable_products: form.applicable_products, applicable_categories: form.applicable_categories,
                member_only: form.member_only, member_tier: form.member_tier,
                max_uses: Number(form.max_uses) || 0, points_required: Number(form.points_required) || 0,
                start_date: form.start_date, end_date: form.end_date,
            };
            const res = await fetch('/api/promotions', {
                method: editPromo ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success(editPromo ? 'ແກ້ໄຂສຳເລັດ' : 'ເພີ່ມໂປຣໂມຊັ່ນສຳເລັດ');
                setShowModal(false);
                fetchPromotions();
            } else toast.error(json.message);
        } catch { toast.error('ບັນທຶກລົ້ມເຫຼວ'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/promotions?id=${deleteTarget.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.status === 'success') { toast.success('ລຶບສຳເລັດ'); fetchPromotions(); }
            else toast.error(json.message);
        } catch { toast.error('ລຶບລົ້ມເຫຼວ'); }
        setDeleteTarget(null);
    };

    const toggleActive = async (p: Promotion) => {
        try {
            await fetch('/api/promotions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: p.id, active: p.active ? 0 : 1 }),
            });
            fetchPromotions();
        } catch { toast.error('ອັບເດດລົ້ມເຫຼວ'); }
    };

    const getTypeInfo = (type: string) => PROMO_TYPES.find(t => t.key === type) || PROMO_TYPES[0];

    const isExpired = (p: Promotion) => p.end_date && new Date(p.end_date) < new Date();
    const isNotStarted = (p: Promotion) => p.start_date && new Date(p.start_date) > new Date();
    const isMaxedOut = (p: Promotion) => p.max_uses > 0 && p.used_count >= p.max_uses;

    const getStatusBadge = (p: Promotion) => {
        if (!p.active) return { text: 'ປິດ', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
        if (isExpired(p)) return { text: 'ໝົດອາຍຸ', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
        if (isNotStarted(p)) return { text: 'ຍັງບໍ່ເລີ່ມ', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
        if (isMaxedOut(p)) return { text: 'ໃຊ້ຄົບແລ້ວ', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' };
        return { text: 'ເປີດໃຊ້', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
    };

    const getPromoSummary = (p: Promotion) => {
        const parts: string[] = [];
        if (p.discount_value > 0) {
            parts.push(p.discount_type === 'percent' ? `ຫຼຸດ ${p.discount_value}%` : `ຫຼຸດ ${p.discount_value.toLocaleString()} ກີບ`);
        }
        if (p.min_purchase > 0) parts.push(`ຊື້ຂັ້ນຕ່ຳ ${p.min_purchase.toLocaleString()} ກີບ`);
        if (p.buy_quantity > 0 && p.get_quantity > 0) parts.push(`ຊື້ ${p.buy_quantity} ແຖມ ${p.get_quantity}`);
        if (p.min_quantity > 0) parts.push(`ຂັ້ນຕ່ຳ ${p.min_quantity} ຊິ້ນ`);
        if (p.member_only) parts.push(`ສະມາຊິກ${p.member_tier ? ` (${p.member_tier}+)` : ''}`);
        if (p.points_required > 0) parts.push(`ໃຊ້ ${p.points_required} ຄະແນນ`);
        if (p.max_uses > 0) parts.push(`ຈຳກັດ ${p.max_uses} ຄັ້ງ (ໃຊ້ແລ້ວ ${p.used_count})`);
        return parts.join(' • ') || 'ບໍ່ມີເງື່ອນໄຂ';
    };

    const activeCount = promotions.filter(p => p.active && !isExpired(p) && !isMaxedOut(p)).length;

    // Render type-specific form fields
    const renderTypeFields = () => {
        const t = form.type;
        return (
            <>
                {/* Discount value - most types need this */}
                {['percent_discount', 'fixed_discount', 'min_purchase', 'member_discount', 'points_redeem', 'time_limited', 'quantity_discount'].includes(t) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">ປະເພດສ່ວນຫຼຸດ</label>
                            <select className="form-input" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                                <option value="percent">ເປີເຊັນ (%)</option>
                                <option value="fixed">ຈຳນວນເງິນ (ກີບ)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{form.discount_type === 'percent' ? 'ເປີເຊັນ (%)' : 'ຈຳນວນ (ກີບ)'}</label>
                            <input type="number" className="form-input" value={form.discount_value}
                                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                                placeholder={form.discount_type === 'percent' ? 'ເຊັ່ນ: 10' : 'ເຊັ່ນ: 5000'} />
                        </div>
                    </div>
                )}

                {/* Minimum purchase amount */}
                {['min_purchase', 'time_limited'].includes(t) && (
                    <div className="form-group">
                        <label className="form-label">🛒 ຍອດຊື້ຂັ້ນຕ່ຳ (ກີບ)</label>
                        <input type="number" className="form-input" value={form.min_purchase}
                            onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                            placeholder="ເຊັ່ນ: 100000" />
                    </div>
                )}

                {/* Buy X Get Y */}
                {t === 'buy_x_get_y' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">🛍️ ຊື້ (ຈຳນວນ)</label>
                            <input type="number" className="form-input" value={form.buy_quantity}
                                onChange={(e) => setForm({ ...form, buy_quantity: e.target.value })}
                                placeholder="ເຊັ່ນ: 2" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">🎁 ແຖມ (ຈຳນວນ)</label>
                            <input type="number" className="form-input" value={form.get_quantity}
                                onChange={(e) => setForm({ ...form, get_quantity: e.target.value })}
                                placeholder="ເຊັ່ນ: 1" />
                        </div>
                    </div>
                )}

                {/* Quantity discount */}
                {t === 'quantity_discount' && (
                    <div className="form-group">
                        <label className="form-label">📦 ຈຳນວນຂັ້ນຕ່ຳ (ຊິ້ນ)</label>
                        <input type="number" className="form-input" value={form.min_quantity}
                            onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                            placeholder="ເຊັ່ນ: 3" />
                    </div>
                )}

                {/* Member-only */}
                {['member_discount', 'points_redeem'].includes(t) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">👥 ສະເພາະສະມາຊິກ</label>
                            <select className="form-input" value={form.member_only ? '1' : '0'}
                                onChange={(e) => setForm({ ...form, member_only: e.target.value === '1' })}>
                                <option value="1">ແມ່ນ (ສະເພາະສະມາຊິກ)</option>
                                <option value="0">ບໍ່ (ທຸກຄົນ)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">🏅 ລະດັບຂັ້ນຕ່ຳ</label>
                            <select className="form-input" value={form.member_tier}
                                onChange={(e) => setForm({ ...form, member_tier: e.target.value })}>
                                <option value="">ທຸກລະດັບ</option>
                                <option value="Bronze">🥉 Bronze</option>
                                <option value="Silver">🥈 Silver</option>
                                <option value="Gold">🥇 Gold</option>
                                <option value="Platinum">💎 Platinum</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Points required */}
                {t === 'points_redeem' && (
                    <div className="form-group">
                        <label className="form-label">⭐ ຄະແນນທີ່ຕ້ອງແລກ</label>
                        <input type="number" className="form-input" value={form.points_required}
                            onChange={(e) => setForm({ ...form, points_required: e.target.value })}
                            placeholder="ເຊັ່ນ: 100" />
                    </div>
                )}

                {/* Time-limited dates */}
                {['time_limited', 'min_purchase', 'buy_x_get_y', 'quantity_discount'].includes(t) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">📅 ວັນເລີ່ມ</label>
                            <input type="date" className="form-input" value={form.start_date}
                                onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">📅 ວັນສິ້ນສຸດ</label>
                            <input type="date" className="form-input" value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                        </div>
                    </div>
                )}

                {/* Product / Category filter */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">🏷️ ສິນຄ້າທີ່ໃຊ້ໄດ້ (ຄັ້ນດ້ວຍ ,)</label>
                        <input className="form-input" value={form.applicable_products}
                            onChange={(e) => setForm({ ...form, applicable_products: e.target.value })}
                            placeholder="ວ່າງ = ທຸກສິນຄ້າ" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">📂 ໝວດໝູ່ທີ່ໃຊ້ໄດ້ (ຄັ້ນດ້ວຍ ,)</label>
                        <input className="form-input" value={form.applicable_categories}
                            onChange={(e) => setForm({ ...form, applicable_categories: e.target.value })}
                            placeholder="ວ່າງ = ທຸກໝວດໝູ່" />
                    </div>
                </div>

                {/* Max uses */}
                <div className="form-group">
                    <label className="form-label">🔢 ຈຳກັດການໃຊ້ (0 = ບໍ່ຈຳກັດ)</label>
                    <input type="number" className="form-input" value={form.max_uses}
                        onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                        placeholder="0" />
                </div>
            </>
        );
    };

    return (
        <POSPageWrapper title="ໂບນັດ / ໂປຣໂມຊັ່ນ" icon={<Gift size={20} />} onRefresh={fetchPromotions}
            actions={<button className="btn btn-sm btn-success" onClick={() => openAdd()}><Plus size={14} /> ເພີ່ມໂປຣໂມຊັ່ນ</button>}>

            {/* Summary */}
            <div className="hist-summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #4A6CF7, #3b5de7)' }}>
                        <Gift size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ໂປຣໂມຊັ່ນທັງໝົດ</span>
                        <span className="hist-summary-value">{promotions.length}</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <Zap size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ເປີດໃຊ້ຢູ່</span>
                        <span className="hist-summary-value">{activeCount}</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <Award size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ໃຊ້ໄປແລ້ວ</span>
                        <span className="hist-summary-value">{promotions.reduce((s, p) => s + p.used_count, 0)} ຄັ້ງ</span>
                    </div>
                </div>
            </div>

            {/* Quick Add Buttons */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>⚡ ສ້າງໂປຣໂມຊັ່ນໄວ:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PROMO_TYPES.map(t => (
                        <button key={t.key} className="btn btn-sm btn-secondary"
                            onClick={() => openAdd(t.key)}
                            style={{ fontSize: 12 }}>
                            {t.icon} {t.label.replace(/^[^\s]+ /, '')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Promotions Table */}
            <div className="pos-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>ປະເພດ</th>
                            <th>ຊື່ໂປຣໂມຊັ່ນ</th>
                            <th>ເງື່ອນໄຂ</th>
                            <th>ໄລຍະເວລາ</th>
                            <th>ສະຖານະ</th>
                            <th>ເປີດ/ປິດ</th>
                            <th>ຈັດການ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ກຳລັງໂຫຼດ...</td></tr>
                        ) : promotions.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>🎁</div>
                                ຍັງບໍ່ມີໂປຣໂມຊັ່ນ — ກົດ "ເພີ່ມໂປຣໂມຊັ່ນ" ເພື່ອເລີ່ມ
                            </td></tr>
                        ) : promotions.map((p, i) => {
                            const typeInfo = getTypeInfo(p.type);
                            const status = getStatusBadge(p);
                            return (
                                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <span style={{ fontSize: 20 }} title={typeInfo.label}>{typeInfo.icon}</span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                                        {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.description}</div>}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 12, maxWidth: 250 }}>{getPromoSummary(p)}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 12 }}>
                                            {p.start_date || p.end_date ? (
                                                <span>
                                                    {p.start_date ? new Date(p.start_date).toLocaleDateString('lo-LA') : '...'} — {p.end_date ? new Date(p.end_date).toLocaleDateString('lo-LA') : '...'}
                                                </span>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>ບໍ່ຈຳກັດ</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                            background: status.bg, color: status.color,
                                        }}>
                                            {status.text}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className={`btn btn-sm ${p.active ? 'btn-success' : 'btn-secondary'}`}
                                            onClick={() => toggleActive(p)}
                                            style={{ minWidth: 50, fontSize: 11 }}>
                                            {p.active ? 'ON' : 'OFF'}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}><Edit size={14} /></button>
                                            <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(p)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }}>
                        <h2 className="modal-title">{editPromo ? '✏️ ແກ້ໄຂໂປຣໂມຊັ່ນ' : '🎁 ເພີ່ມໂປຣໂມຊັ່ນໃໝ່'}</h2>

                        {/* Type Selection */}
                        <div className="form-group">
                            <label className="form-label">ປະເພດໂປຣໂມຊັ່ນ</label>
                            <select className="form-input" value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                {PROMO_TYPES.map(t => (
                                    <option key={t.key} value={t.key}>{t.label}</option>
                                ))}
                            </select>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {getTypeInfo(form.type).desc}
                            </div>
                        </div>

                        {/* Name & Description */}
                        <div className="form-group">
                            <label className="form-label">ຊື່ໂປຣໂມຊັ່ນ *</label>
                            <input className="form-input" value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="ເຊັ່ນ: ສ່ວນຫຼຸດເປີດຮ້ານໃໝ່" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ລາຍລະອຽດ</label>
                            <input className="form-input" value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="ອະທິບາຍເພີ່ມ (ບໍ່ບັງຄັບ)" />
                        </div>

                        {/* Type-specific fields */}
                        {renderTypeFields()}

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>ຍົກເລີກ</button>
                            <button className="btn btn-success" onClick={handleSave}>{editPromo ? '💾 ບັນທຶກ' : '✅ ເພີ່ມໂປຣໂມຊັ່ນ'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Promo Types Info */}
            <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-secondary)',
                fontSize: 12, color: 'var(--text-muted)'
            }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>📋 ປະເພດໂປຣໂມຊັ່ນທີ່ຮອງຮັບ:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 16px' }}>
                    {PROMO_TYPES.map(t => (
                        <div key={t.key}><strong>{t.icon}</strong> {t.label.replace(/^[^\s]+ /, '')} — <span style={{ color: 'var(--text-muted)' }}>{t.desc}</span></div>
                    ))}
                </div>
            </div>

            <ConfirmModal
                isOpen={!!deleteTarget}
                type="delete"
                message={`ທ່ານຕ້ອງການລຶບໂປຣໂມຊັ່ນ "${deleteTarget?.name}" ແທ້ບໍ?`}
                detail={deleteTarget ? getPromoSummary(deleteTarget) : undefined}
                confirmText="🗑️ ລຶບໂປຣໂມຊັ່ນ"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </POSPageWrapper>
    );
}
