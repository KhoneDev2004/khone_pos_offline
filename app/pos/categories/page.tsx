'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import ConfirmModal from '@/app/components/ConfirmModal';
import { FolderOpen, Plus, Edit, Trash2, Upload, X } from 'lucide-react';

interface Category { id: number | null; name: string; description: string; product_count: number; }

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editCat, setEditCat] = useState<Category | null>(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/categories');
            const json = await res.json();
            if (json.status === 'success') setCategories(json.data.categories);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    };

    useEffect(() => { fetchCategories(); }, []);

    const openAdd = () => { setEditCat(null); setForm({ name: '', description: '' }); setShowModal(true); };
    const openEdit = (c: Category) => { setEditCat(c); setForm({ name: c.name, description: c.description || '' }); setShowModal(true); };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('ກະລຸນາປ້ອນຊື່'); return; }
        try {
            if (editCat) {
                await fetch('/api/categories', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editCat.id, name: form.name.trim(), old_name: editCat.name, description: form.description })
                });
                toast.success('ແກ້ໄຂສຳເລັດ');
            } else {
                // Bulk add support
                const names = form.name.split('\n').map(n => n.trim()).filter(n => n);
                if (names.length === 0) return;
                
                let count = 0;
                for (const name of names) {
                    await fetch('/api/categories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, description: form.description })
                    });
                    count++;
                }
                toast.success(count > 1 ? `ເພີ່ມ ${count} ໝວດໝູ່ສຳເລັດ` : 'ເພີ່ມສຳເລັດ');
            }
            setShowModal(false);
            fetchCategories();
        } catch { toast.error('ບັນທຶກລົ້ມເຫຼວ'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await fetch(`/api/categories?id=${deleteTarget.id || ''}&name=${encodeURIComponent(deleteTarget.name)}`, { method: 'DELETE' });
            toast.success('ລຶບສຳເລັດ');
            fetchCategories();
        } catch { toast.error('ລຶບລົ້ມເຫຼວ'); }
        setDeleteTarget(null);
    };

    const handleExcelImport = async (file: File) => {
        try {
            const XLSX = await import('xlsx');
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
            let count = 0;
            for (const row of rows) {
                const name = String(row.name || row.Name || row['ຊື່'] || '').trim();
                if (!name) continue;
                const desc = String(row.description || row.Description || row['ລາຍລະອຽດ'] || '').trim();
                await fetch('/api/categories', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description: desc })
                });
                count++;
            }
            toast.success(`ນຳເຂົ້າ ${count} ໝວດໝູ່ສຳເລັດ`);
            fetchCategories();
        } catch { toast.error('ນຳເຂົ້າລົ້ມເຫຼວ'); }
    };

    const colors = ['#4A6CF7', '#22c55e', '#EAB308', '#EF4444', '#A855F7', '#06B6D4', '#F97316', '#EC4899'];

    return (
        <POSPageWrapper title="ໝວດໝູ່" icon={<FolderOpen size={20} />} onRefresh={fetchCategories}
            actions={
                <div className="flex gap-2">
                    <button className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
                        <Upload size={14} /> Excel
                    </button>
                    <button className="btn btn-sm btn-success" onClick={openAdd}><Plus size={14} /> ເພີ່ມ</button>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { if (e.target.files?.[0]) handleExcelImport(e.target.files[0]); e.target.value = ''; }} />
                </div>
            }>

            <div className="pos-cards-grid">
                {loading ? (
                    <div className="empty-state"><div className="empty-state-text">ກຳລັງໂຫຼດ...</div></div>
                ) : categories.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">📁</div><div className="empty-state-text">ຍັງບໍ່ມີໝວດໝູ່</div></div>
                ) : categories.map((cat, i) => (
                    <div key={cat.name} className="pos-category-card">
                        <div className="pos-category-icon" style={{ background: colors[i % colors.length] }}>
                            <FolderOpen size={24} />
                        </div>
                        <div className="pos-category-info">
                            <div className="pos-category-name">{cat.name}</div>
                            <div className="pos-category-count">{cat.product_count} ສິນຄ້າ</div>
                        </div>
                        <div className="pos-category-actions">
                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(cat)}><Edit size={12} /></button>
                            <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(cat)}><Trash2 size={12} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">{editCat ? 'ແກ້ໄຂໝວດໝູ່' : 'ເພີ່ມໝວດໝູ່'}</h2>
                        <div className="form-group">
                            <label className="form-label">ຊື່ໝວດໝູ່ *</label>
                            {editCat ? (
                                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ເຊັ່ນ: ເຄື່ອງດື່ມ" />
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {form.name.split('\n').map((name, index, arr) => (
                                        <div key={index} className="flex gap-2">
                                            <input 
                                                className="form-input flex-1" 
                                                value={name} 
                                                autoFocus={index === arr.length - 1 && index > 0}
                                                onChange={(e) => {
                                                    const newNames = [...arr];
                                                    newNames[index] = e.target.value;
                                                    setForm({ ...form, name: newNames.join('\n') });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        setForm({ ...form, name: form.name + '\n' });
                                                    }
                                                }}
                                                placeholder={index === 0 ? "ເຊັ່ນ: ເຄື່ອງດື່ມ" : "ຊື່ໝວດໝູ່"} 
                                            />
                                            {index === arr.length - 1 ? (
                                                <button 
                                                    className="btn btn-secondary flex-shrink-0 px-3" 
                                                    onClick={() => setForm({ ...form, name: form.name + '\n' })}
                                                    title="ເພີ່ມຊ່ອງປ້ອນຂໍ້ມູນ (Enter)"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            ) : (
                                                <button 
                                                    className="btn btn-danger flex-shrink-0 px-3" 
                                                    onClick={() => {
                                                        const newNames = arr.filter((_, i) => i !== index);
                                                        setForm({ ...form, name: newNames.join('\n') });
                                                    }}
                                                    title="ລຶບ"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <div className="text-xs text-gray-500 mt-1">ກົດ Enter ຫຼື ປຸ່ມ + ເພື່ອເພີ່ມຫຼາຍອັນ</div>
                                </div>
                            )}
                        </div>
                        <div className="form-group"><label className="form-label">ລາຍລະອຽດ</label><input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>ຍົກເລີກ</button>
                            <button className="btn btn-success" onClick={handleSave}>ບັນທຶກ</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                type="delete"
                message={`ທ່ານຕ້ອງການລຶບໝວດໝູ່ "${deleteTarget?.name}" ແທ້ບໍ?`}
                detail={deleteTarget && deleteTarget.product_count > 0 ? `⚠️ ມີສິນຄ້າໃນໝວດໝູ່ນີ້ ${deleteTarget.product_count} ລາຍການ` : undefined}
                confirmText="🗑️ ລຶບໝວດໝູ່"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </POSPageWrapper>
    );
}
