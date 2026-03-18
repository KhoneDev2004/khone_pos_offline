'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import ConfirmModal from '@/app/components/ConfirmModal';
import { UserCog, Plus, Edit, Trash2, Shield, Lock, Eye, EyeOff, Check } from 'lucide-react';

interface UserData {
    id: number; username: string; full_name: string; role: string;
    permissions: Record<string, boolean>; active: number; created_at: string;
}

const PERMS = [
    { key: 'sell', label: 'ຂາຍສິນຄ້າ', icon: '🛒' },
    { key: 'view_reports', label: 'ເບິ່ງລາຍງານ', icon: '📊' },
    { key: 'manage_products', label: 'ຈັດການສິນຄ້າ', icon: '📦' },
    { key: 'manage_stock', label: 'ຈັດການສະຕ໊ອກ', icon: '📋' },
    { key: 'manage_users', label: 'ຈັດການຜູ້ໃຊ້', icon: '👥' },
    { key: 'settings', label: 'ຕັ້ງຄ່າ', icon: '⚙️' },
];

export default function EmployeesPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [editUser, setEditUser] = useState<UserData | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        username: '', password: '', full_name: '', role: 'cashier',
        permissions: { sell: true, view_reports: false, manage_products: false, manage_stock: false, manage_users: false, settings: false } as Record<string, boolean>,
    });
    const [pwForm, setPwForm] = useState({ user_id: 0, new_password: '', confirm: '' });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth');
            const json = await res.json();
            if (json.status === 'success') setUsers(json.data.users);
        } catch { toast.error('ໂຫຼດຂໍ້ມູນລົ້ມເຫຼວ'); }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const openAdd = () => {
        setEditUser(null);
        setForm({
            username: '', password: '', full_name: '', role: 'cashier',
            permissions: { sell: true, view_reports: false, manage_products: false, manage_stock: false, manage_users: false, settings: false }
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const openEdit = (u: UserData) => {
        setEditUser(u);
        setForm({
            username: u.username,
            password: '',
            full_name: u.full_name || '',
            role: u.role,
            permissions: { ...u.permissions },
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const applyRoleDefaults = (role: string) => {
        const perms: Record<string, boolean> = { sell: true, view_reports: false, manage_products: false, manage_stock: false, manage_users: false, settings: false };
        if (role === 'admin') {
            Object.keys(perms).forEach(k => perms[k] = true);
        } else if (role === 'manager') {
            perms.view_reports = true; perms.manage_products = true; perms.manage_stock = true;
        }
        return perms;
    };

    const handleSave = async () => {
        if (!editUser && !form.username) { toast.error('ກະລຸນາປ້ອນ Username'); return; }
        if (!editUser && !form.password) { toast.error('ກະລຸນາປ້ອນລະຫັດຜ່ານ'); return; }
        try {
            if (editUser) {
                // Update existing user info
                const res = await fetch('/api/auth', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: editUser.id,
                        action: 'update_info',
                        full_name: form.full_name,
                        role: form.role,
                        permissions: form.permissions,
                    }),
                });
                const json = await res.json();
                if (json.status === 'success') {
                    toast.success('ແກ້ໄຂຜູ້ໃຊ້ສຳເລັດ');
                    setShowModal(false);
                    fetchUsers();
                } else toast.error(json.message);
            } else {
                // Create new user
                const res = await fetch('/api/auth', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: form.username,
                        password: form.password,
                        full_name: form.full_name,
                        role: form.role,
                        permissions: form.permissions,
                    }),
                });
                const json = await res.json();
                if (json.status === 'success') {
                    toast.success('ສ້າງຜູ້ໃຊ້ສຳເລັດ');
                    setShowModal(false);
                    fetchUsers();
                } else toast.error(json.message);
            }
        } catch { toast.error('ບັນທຶກລົ້ມເຫຼວ'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/auth?id=${deleteTarget.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.status === 'success') { toast.success('ລຶບສຳເລັດ'); fetchUsers(); }
            else toast.error(json.message);
        } catch { toast.error('ລຶບລົ້ມເຫຼວ'); }
        setDeleteTarget(null);
    };

    const handleChangePassword = async () => {
        if (!pwForm.new_password) { toast.error('ກະລຸນາປ້ອນລະຫັດຜ່ານໃໝ່'); return; }
        if (pwForm.new_password !== pwForm.confirm) { toast.error('ລະຫັດຜ່ານບໍ່ກົງກັນ'); return; }
        try {
            const res = await fetch('/api/auth', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: pwForm.user_id, new_password: pwForm.new_password }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success('ປ່ຽນລະຫັດຜ່ານສຳເລັດ');
                setShowPasswordModal(false);
            } else toast.error(json.message);
        } catch { toast.error('ລົ້ມເຫຼວ'); }
    };

    const togglePerm = (key: string) => {
        setForm({ ...form, permissions: { ...form.permissions, [key]: !form.permissions[key] } });
    };

    return (
        <POSPageWrapper title="ຈັດການຜູ້ໃຊ້" icon={<UserCog size={20} />} onRefresh={fetchUsers}
            actions={<button className="btn btn-sm btn-success" onClick={openAdd}><Plus size={14} /> ສ້າງຜູ້ໃຊ້</button>}>

            <div className="pos-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th><th>Username</th><th>ຊື່ເຕັມ</th>
                            <th>ບົດບາດ</th><th>ສິດ</th><th>ສະຖານະ</th><th>ຈັດການ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>ກຳລັງໂຫຼດ...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>ບໍ່ມີຂໍ້ມູນ</td></tr>
                        ) : users.map((u, i) => (
                            <tr key={u.id}>
                                <td>{i + 1}</td>
                                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{u.username}</td>
                                <td>{u.full_name || '-'}</td>
                                <td>
                                    <span className={`emp-role-badge ${u.role}`}>
                                        <Shield size={12} />
                                        {u.role === 'admin' ? 'ແອດມິນ' : u.role === 'manager' ? 'ຜູ້ຈັດການ' : 'ພະນັກງານ'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {PERMS.filter(p => u.permissions[p.key]).map(p => (
                                            <span key={p.key} title={p.label} style={{ fontSize: 14 }}>{p.icon}</span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <span className={u.active ? 'emp-status-active' : 'emp-status-inactive'}>
                                        {u.active ? '● ໃຊ້ງານ' : '○ ປິດ'}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex gap-2">
                                        <button className="btn btn-sm btn-secondary" title="ແກ້ໄຂ"
                                            onClick={() => openEdit(u)}>
                                            <Edit size={14} />
                                        </button>
                                        <button className="btn btn-sm btn-secondary" title="ປ່ຽນລະຫັດຜ່ານ"
                                            onClick={() => { setPwForm({ user_id: u.id, new_password: '', confirm: '' }); setShowPasswordModal(true); }}>
                                            <Lock size={14} />
                                        </button>
                                        <button className="btn btn-sm btn-danger" title="ລຶບ"
                                            onClick={() => setDeleteTarget(u)}
                                            disabled={u.role === 'admin' && users.filter(x => x.role === 'admin').length <= 1}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <h2 className="modal-title">{editUser ? '✏️ ແກ້ໄຂຜູ້ໃຊ້' : '🔐 ສ້າງຜູ້ໃຊ້ໃໝ່'}</h2>
                        {!editUser && (
                            <div className="form-group">
                                <label className="form-label">Username *</label>
                                <input className="form-input" value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    placeholder="ເຊັ່ນ: cashier01" />
                            </div>
                        )}
                        {editUser && (
                            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', marginBottom: 12, fontSize: 13 }}>
                                👤 Username: <strong>{editUser.username}</strong>
                            </div>
                        )}
                        {!editUser && (
                            <div className="form-group">
                                <label className="form-label">ລະຫັດຜ່ານ *</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showPassword ? 'text' : 'password'} className="form-input" value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="ຕັ້ງລະຫັດຜ່ານ" />
                                    <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                        onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">ຊື່ເຕັມ</label>
                            <input className="form-input" value={form.full_name}
                                onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ບົດບາດ</label>
                            <select className="form-input" value={form.role}
                                onChange={(e) => {
                                    const r = e.target.value;
                                    setForm({ ...form, role: r, permissions: applyRoleDefaults(r) });
                                }}>
                                <option value="cashier">ພະນັກງານຂາຍ</option>
                                <option value="manager">ຜູ້ຈັດການ</option>
                                <option value="admin">ແອດມິນ</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">ສິດການໃຊ້ງານ</label>
                            <div className="emp-perm-grid">
                                {PERMS.map(p => (
                                    <div key={p.key} className={`emp-perm-item ${form.permissions[p.key] ? 'active' : ''}`}
                                        onClick={() => togglePerm(p.key)}>
                                        <div className="emp-perm-checkbox">{form.permissions[p.key] ? <Check size={12} /> : ''}</div>
                                        <span>{p.icon} {p.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>ຍົກເລີກ</button>
                            <button className="btn btn-success" onClick={handleSave}>{editUser ? '💾 ບັນທຶກ' : '✅ ສ້າງຜູ້ໃຊ້'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">🔑 ປ່ຽນລະຫັດຜ່ານ</h2>
                        <div className="form-group">
                            <label className="form-label">ລະຫັດຜ່ານໃໝ່</label>
                            <input type="password" className="form-input" value={pwForm.new_password}
                                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ຢືນຢັນລະຫັດຜ່ານ</label>
                            <input type="password" className="form-input" value={pwForm.confirm}
                                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>ຍົກເລີກ</button>
                            <button className="btn btn-success" onClick={handleChangePassword}>ບັນທຶກ</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                type="delete"
                message={`ທ່ານຕ້ອງການລຶບຜູ້ໃຊ້ "${deleteTarget?.username}" แທ້ບໍ?`}
                detail={deleteTarget ? `ຊື່ເຕັມ: ${deleteTarget.full_name || '-'} | ບົດບາດ: ${deleteTarget.role === 'admin' ? 'ແອດມິນ' : deleteTarget.role === 'manager' ? 'ຜູ້ຈັດການ' : 'ພະນັກງານ'}` : undefined}
                confirmText="🗑️ ລຶບຜູ້ໃຊ້"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </POSPageWrapper>
    );
}
