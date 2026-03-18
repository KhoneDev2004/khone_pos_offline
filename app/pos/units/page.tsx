'use client';

import React, { useState, useEffect, useRef } from 'react';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import ConfirmModal from '@/app/components/ConfirmModal';
import { Ruler, Plus, Edit, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Unit { id: number; name: string; abbreviation: string; }

export default function UnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUnit, setEditUnit] = useState<Unit | null>(null);
    const [form, setForm] = useState({ name: '', abbreviation: '' });
    const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchUnits = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/units');
            const json = await res.json();
            if (json.status === 'success') setUnits(json.data.units);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    };

    useEffect(() => { fetchUnits(); }, []);

    const openAdd = () => { setEditUnit(null); setForm({ name: '', abbreviation: '' }); setShowModal(true); };
    const openEdit = (u: Unit) => { setEditUnit(u); setForm({ name: u.name, abbreviation: u.abbreviation }); setShowModal(true); };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('ກະລຸນາປ້ອນຊື່ໜ່ວຍ'); return; }
        try {
            if (editUnit) {
                await fetch('/api/units', {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editUnit.id, ...form, name: form.name.trim() })
                });
                toast.success('ແກ້ໄຂສຳເລັດ');
            } else {
                const names = form.name.split('\n').map(n => n.trim()).filter(n => n);
                if (names.length === 0) return;
                
                let count = 0;
                for (const name of names) {
                    await fetch('/api/units', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, abbreviation: form.abbreviation })
                    });
                    count++;
                }
                toast.success(count > 1 ? `ເພີ່ມ ${count} ໜ່ວຍສຳເລັດ` : 'ເພີ່ມສຳເລັດ');
            }
            setShowModal(false);
            fetchUnits();
        } catch { toast.error('ບັນທຶກລົ້ມເຫຼວ'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await fetch(`/api/units?id=${deleteTarget.id}`, { method: 'DELETE' });
            toast.success('ລຶບສຳເລັດ');
            fetchUnits();
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
                const abbr = String(row.abbreviation || row.Abbreviation || row['ຕົວຫຍໍ້'] || '').trim();
                await fetch('/api/units', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, abbreviation: abbr })
                });
                count++;
            }
            toast.success(`ນຳເຂົ້າ ${count} ໜ່ວຍສຳເລັດ`);
            fetchUnits();
        } catch { toast.error('ນຳເຂົ້າລົ້ມເຫຼວ'); }
    };

    return (
        <POSPageWrapper title="ໜ່ວຍ" icon={<Ruler size={20} />} onRefresh={fetchUnits}
            actions={
                <div className="flex gap-2">
                    <button className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
                        <Upload size={14} /> Excel
                    </button>
                    <button className="btn btn-sm btn-success" onClick={openAdd}><Plus size={14} /> ເພີ່ມໜ່ວຍ</button>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { if (e.target.files?.[0]) handleExcelImport(e.target.files[0]); e.target.value = ''; }} />
                </div>
            }>

            <div className="pos-table-wrapper">
                <table className="data-table">
                    <thead><tr><th>#</th><th>ຊື່ໜ່ວຍ</th><th>ຕົວຫຍໍ້</th><th>ຈັດການ</th></tr></thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>ກຳລັງໂຫຼດ...</td></tr>
                        ) : units.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>ບໍ່ມີຂໍ້ມູນ</td></tr>
                        ) : units.map((unit, i) => (
                            <tr key={unit.id}>
                                <td>{i + 1}</td>
                                <td style={{ fontWeight: 600 }}>{unit.name}</td>
                                <td><span className="badge badge-info">{unit.abbreviation}</span></td>
                                <td>
                                    <div className="flex gap-2">
                                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(unit)}><Edit size={14} /></button>
                                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(unit)}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">{editUnit ? 'ແກ້ໄຂໜ່ວຍ' : 'ເພີ່ມໜ່ວຍ'}</h2>
                        <div className="form-group">
                            <label className="form-label">ຊື່ໜ່ວຍ *</label>
                            {editUnit ? (
                                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ເຊັ່ນ: ກິໂລກຣາມ" />
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
                                                placeholder={index === 0 ? "ເຊັ່ນ: ກິໂລກຣາມ" : "ຊື່ໜ່ວຍ"} 
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
                        <div className="form-group"><label className="form-label">ຕົວຫຍໍ້</label><input className="form-input" value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} placeholder="ເຊັ່ນ: kg" /></div>
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
                message={`ທ່ານຕ້ອງການລຶບໜ່ວຍ "${deleteTarget?.name}" ແທ້ບໍ?`}
                confirmText="🗑️ ລຶບໜ່ວຍ"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </POSPageWrapper>
    );
}
