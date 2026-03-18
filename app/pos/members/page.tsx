'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import ConfirmModal from '@/app/components/ConfirmModal';
import { Users, Plus, Edit, Trash2, Search, X, Phone, Star, ShoppingBag, Award } from 'lucide-react';

interface Member {
    id: number; name: string; phone: string;
    total_spent: number; points: number; visit_count: number;
    note: string; created_at: string; updated_at: string;
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMember, setEditMember] = useState<Member | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ name: '', phone: '', note: '' });

    const fetchMembers = async () => {
        setLoading(true);
        try {
            let url = '/api/members';
            if (search) url += `?search=${encodeURIComponent(search)}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.status === 'success') setMembers(json.data.members);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    };

    useEffect(() => { fetchMembers(); }, []);

    const openAdd = () => { setEditMember(null); setForm({ name: '', phone: '', note: '' }); setShowModal(true); };
    const openEdit = (m: Member) => { setEditMember(m); setForm({ name: m.name, phone: m.phone, note: m.note || '' }); setShowModal(true); };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('ກະລຸນາປ້ອນຊື່'); return; }
        if (!form.phone.trim()) { toast.error('ກະລຸນາປ້ອນເບີໂທ'); return; }
        try {
            const res = await fetch('/api/members', {
                method: editMember ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editMember ? { id: editMember.id, ...form } : form),
            });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success(editMember ? 'ແກ້ໄຂສຳເລັດ' : 'ເພີ່ມສະມາຊິກສຳເລັດ');
                setShowModal(false);
                fetchMembers();
            } else toast.error(json.message);
        } catch { toast.error('ບັນທຶກລົ້ມເຫຼວ'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/members?id=${deleteTarget.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.status === 'success') { toast.success('ລຶບສຳເລັດ'); fetchMembers(); }
            else toast.error(json.message);
        } catch { toast.error('ລຶບລົ້ມເຫຼວ'); }
        setDeleteTarget(null);
    };

    const handleSearch = () => { fetchMembers(); };

    // Tier based on total_spent
    const getTier = (spent: number) => {
        if (spent >= 50000000) return { name: 'Platinum', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', icon: '💎' };
        if (spent >= 20000000) return { name: 'Gold', color: '#eab308', bg: 'rgba(234,179,8,0.15)', icon: '🥇' };
        if (spent >= 5000000) return { name: 'Silver', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: '🥈' };
        return { name: 'Bronze', color: '#cd7f32', bg: 'rgba(205,127,50,0.15)', icon: '🥉' };
    };

    const totalMembers = members.length;
    const totalPoints = members.reduce((sum, m) => sum + m.points, 0);
    const totalSpent = members.reduce((sum, m) => sum + m.total_spent, 0);

    return (
        <POSPageWrapper title="ສະມາຊິກ / ລູກຄ້າ" icon={<Users size={20} />} onRefresh={fetchMembers}
            actions={<button className="btn btn-sm btn-success" onClick={openAdd}><Plus size={14} /> ເພີ່ມສະມາຊິກ</button>}>

            {/* Summary */}
            <div className="hist-summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #4A6CF7, #3b5de7)' }}>
                        <Users size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ສະມາຊິກທັງໝົດ</span>
                        <span className="hist-summary-value">{totalMembers}</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <Star size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ຄະແນນທັງໝົດ</span>
                        <span className="hist-summary-value">{totalPoints.toLocaleString()}</span>
                    </div>
                </div>
                <div className="hist-summary-card">
                    <div className="hist-summary-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <ShoppingBag size={20} />
                    </div>
                    <div className="hist-summary-info">
                        <span className="hist-summary-label">ຍອດຊື້ລວມ</span>
                        <span className="hist-summary-value" style={{ fontSize: 14 }}>{totalSpent.toLocaleString()} ກີບ</span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="pos-search-wrapper" style={{ maxWidth: 400, marginBottom: 16 }}>
                <Search size={18} className="pos-search-icon" />
                <input type="text" className="pos-search-input" placeholder="ຄົ້ນຫາ ຊື່ ຫຼື ເບີໂທ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} />
                {search && <button className="pos-search-clear" onClick={() => { setSearch(''); setTimeout(fetchMembers, 100); }}><X size={16} /></button>}
            </div>

            {/* Members Table */}
            <div className="pos-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>ຊື່ລູກຄ້າ</th>
                            <th>ເບີໂທ</th>
                            <th>ລະດັບ</th>
                            <th>ຍອດຊື້ສະສົມ</th>
                            <th>ຄະແນນ</th>
                            <th>ຈຳນວນຄັ້ງ</th>
                            <th>ໝາຍເຫດ</th>
                            <th>ຈັດການ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ກຳລັງໂຫຼດ...</td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
                                {search ? 'ບໍ່ພົບຂໍ້ມູນ' : 'ຍັງບໍ່ມີສະມາຊິກ'}
                            </td></tr>
                        ) : members.map((m, i) => {
                            const tier = getTier(m.total_spent);
                            return (
                                <tr key={m.id}>
                                    <td>{i + 1}</td>
                                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Phone size={13} /> {m.phone}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                            background: tier.bg, color: tier.color,
                                        }}>
                                            {tier.icon} {tier.name}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600, color: '#22c55e' }}>{m.total_spent.toLocaleString()} ກີບ</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Award size={14} style={{ color: '#f59e0b' }} />
                                            <span style={{ fontWeight: 600 }}>{m.points.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td>{m.visit_count} ຄັ້ງ</td>
                                    <td style={{ maxWidth: 150, fontSize: 12, color: 'var(--text-muted)' }}>{m.note || '-'}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(m)}><Edit size={14} /></button>
                                            <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(m)}><Trash2 size={14} /></button>
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
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">{editMember ? '✏️ ແກ້ໄຂສະມາຊິກ' : '➕ ເພີ່ມສະມາຊິກໃໝ່'}</h2>
                        <div className="form-group">
                            <label className="form-label">ຊື່ລູກຄ້າ *</label>
                            <input className="form-input" value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="ເຊັ່ນ: ທ. ສົມຈິດ" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ເບີໂທ *</label>
                            <input className="form-input" value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="ເຊັ່ນ: 020-1234-5678" type="tel" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ໝາຍເຫດ</label>
                            <input className="form-input" value={form.note}
                                onChange={(e) => setForm({ ...form, note: e.target.value })}
                                placeholder="ບັນທຶກເພີ່ມ (ບໍ່ບັງຄັບ)" />
                        </div>

                        {editMember && (
                            <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>📊 ຂໍ້ມູນສະສົມ</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                    <div>ຍອດຊື້: <strong>{editMember.total_spent.toLocaleString()} ກີບ</strong></div>
                                    <div>ຄະແນນ: <strong>{editMember.points.toLocaleString()}</strong></div>
                                    <div>ຈຳນວນຄັ້ງ: <strong>{editMember.visit_count} ຄັ້ງ</strong></div>
                                    <div>ລະດັບ: <strong>{getTier(editMember.total_spent).icon} {getTier(editMember.total_spent).name}</strong></div>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>ຍົກເລີກ</button>
                            <button className="btn btn-success" onClick={handleSave}>{editMember ? 'ບັນທຶກ' : '✅ ເພີ່ມສະມາຊິກ'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tier Info */}
            <div style={{ 
                marginTop: 16, padding: '12px 16px', borderRadius: 12, 
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-secondary)',
                fontSize: 12, color: 'var(--text-muted)' 
            }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🏆 ລະດັບສະມາຊິກ (ຕາມຍອດຊື້ສະສົມ):</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>🥉 Bronze: 0 ກີບ+</span>
                    <span>🥈 Silver: 5,000,000 ກີບ+</span>
                    <span>🥇 Gold: 20,000,000 ກີບ+</span>
                    <span>💎 Platinum: 50,000,000 ກີບ+</span>
                </div>
                <div style={{ marginTop: 4 }}>⭐ ຄະແນນ: ທຸກ 10,000 ກີບ = 1 ຄະແນນ</div>
            </div>

            <ConfirmModal
                isOpen={!!deleteTarget}
                type="delete"
                message={`ທ່ານຕ້ອງການລຶບສະມາຊິກ "${deleteTarget?.name}" ແທ້ບໍ?`}
                detail={deleteTarget ? `ເບີໂທ: ${deleteTarget.phone} | ຄະແນນ: ${deleteTarget.points.toLocaleString()} | ຍອດຊື້: ${deleteTarget.total_spent.toLocaleString()} ກີບ` : undefined}
                confirmText="🗑️ ລຶບສະມາຊິກ"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </POSPageWrapper>
    );
}
