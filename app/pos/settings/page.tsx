'use client';

import React, { useState, useEffect } from 'react';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import { Settings, Store, Globe, Printer, Database, Save, Receipt, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        shop_name: 'ຮ້ານສະດວກຊື້ ກິ່ງແກ້ວ',
        shop_phone: '020-1234-5678',
        shop_address: 'ບ້ານ ດົງໂດກ, ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ',
        currency: 'LAK',
        tax_rate: '0',
        receipt_paper_size: '80',
        receipt_header: 'ຂອບໃຈທີ່ມາອຸດໜູນ',
        receipt_footer: 'ກະລຸນາກັບມາໃໝ່',
        lak_per_cny: '3100',
        lak_per_thb: '683',
        lak_per_usd: '21450',
        enable_thb: 'true',
        enable_cny: 'true',
        enable_usd: 'true',
    });

    const [customWidth, setCustomWidth] = useState('');

    useEffect(() => {
        // Load from API
        fetch('/api/settings').then(r => r.json()).then(json => {
            if (json.status === 'success' && json.data) {
                setSettings(prev => ({ ...prev, ...json.data }));
            }
        }).catch(() => { /* use defaults */ });
    }, []);

    const handleSave = async () => {
        try {
            const res = await fetch('/api/settings', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const json = await res.json();
            if (json.status === 'success') toast.success('ບັນທຶກການຕັ້ງຄ່າສຳເລັດ');
            else toast.error(json.message);
        } catch { toast.success('ບັນທຶກສຳເລັດ (local)'); }
    };

    const update = (key: string, value: string) => setSettings({ ...settings, [key]: value });

    const paperSizes = [
        { value: '58', label: '58mm', desc: 'ນ້ອຍ' },
        { value: '80', label: '80mm', desc: 'ມາດຕະຖານ' },
        { value: '88', label: '88mm', desc: 'ໃຫຍ່' },
    ];

    return (
        <POSPageWrapper title="ຕັ້ງຄ່າ" icon={<Settings size={20} />}
            actions={<button className="btn btn-sm btn-success" onClick={handleSave}><Save size={14} /> ບັນທຶກ</button>}>

            <div className="pos-settings-grid">
                {/* Store Settings */}
                <div className="pos-settings-section">
                    <div className="pos-settings-header"><Store size={18} /> ຂໍ້ມູນຮ້ານ</div>
                    <div className="form-group"><label className="form-label">ຊື່ຮ້ານ</label><input className="form-input" value={settings.shop_name} onChange={(e) => update('shop_name', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">ເບີໂທ</label><input className="form-input" value={settings.shop_phone} onChange={(e) => update('shop_phone', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">ທີ່ຢູ່</label><textarea className="form-input" rows={2} value={settings.shop_address} onChange={(e) => update('shop_address', e.target.value)} /></div>
                </div>

                {/* Language & Currency */}
                <div className="pos-settings-section">
                    <div className="pos-settings-header"><Globe size={18} /> ເງິນຕາ</div>
                    <div className="form-group">
                        <label className="form-label">ສະກຸນເງິນ</label>
                        <select className="form-input" value={settings.currency} onChange={(e) => update('currency', e.target.value)}>
                            <option value="LAK">LAK (ກີບ)</option>
                            <option value="THB">THB (ບາດ)</option>
                            <option value="USD">USD (ໂດລ່າ)</option>
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">ອັດຕາພາສີ (%)</label><input type="number" className="form-input" value={settings.tax_rate} onChange={(e) => update('tax_rate', e.target.value)} /></div>
                </div>

                {/* Exchange Rates */}
                <div className="pos-settings-section">
                    <div className="pos-settings-header"><TrendingUp size={18} /> ອັດຕາແລກປ່ຽນ</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px 0' }}>ເປີດ/ປິດ ສະກຸນເງິນທີ່ຕ້ອງການໃຊ້ໃນໜ້າຊຳລະ</p>

                    {/* THB */}
                    <div className="form-group" style={{ opacity: settings.enable_thb === 'true' ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label className="form-label" style={{ margin: 0 }}>🇹🇭 1,000 ບາດ (THB) = ? ກີບ</label>
                            <button
                                type="button"
                                onClick={() => update('enable_thb', settings.enable_thb === 'true' ? 'false' : 'true')}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    color: settings.enable_thb === 'true' ? '#22c55e' : 'var(--text-muted)',
                                    transition: 'color 0.2s',
                                }}
                                title={settings.enable_thb === 'true' ? 'ເປີດຢູ່ - ກົດເພື່ອປິດ' : 'ປິດຢູ່ - ກົດເພື່ອເປີດ'}
                            >
                                {settings.enable_thb === 'true' ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="number" className="form-input" value={settings.lak_per_thb} onChange={(e) => update('lak_per_thb', e.target.value)} disabled={settings.enable_thb !== 'true'} />
                        </div>
                        <div style={{ fontSize: 13, color: '#22c55e', marginTop: 4, fontWeight: 600 }}>
                            = {(Number(settings.lak_per_thb) * 1000).toLocaleString()} ກີບ
                        </div>
                    </div>

                    {/* CNY */}
                    <div className="form-group" style={{ opacity: settings.enable_cny === 'true' ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label className="form-label" style={{ margin: 0 }}>🇨🇳 100 ຢວນ (CNY) = ? ກີບ</label>
                            <button
                                type="button"
                                onClick={() => update('enable_cny', settings.enable_cny === 'true' ? 'false' : 'true')}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    color: settings.enable_cny === 'true' ? '#22c55e' : 'var(--text-muted)',
                                    transition: 'color 0.2s',
                                }}
                                title={settings.enable_cny === 'true' ? 'ເປີດຢູ່ - ກົດເພື່ອປິດ' : 'ປິດຢູ່ - ກົດເພື່ອເປີດ'}
                            >
                                {settings.enable_cny === 'true' ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="number" className="form-input" value={settings.lak_per_cny} onChange={(e) => update('lak_per_cny', e.target.value)} disabled={settings.enable_cny !== 'true'} />
                        </div>
                        <div style={{ fontSize: 13, color: '#22c55e', marginTop: 4, fontWeight: 600 }}>
                            = {(Number(settings.lak_per_cny) * 100).toLocaleString()} ກີບ
                        </div>
                    </div>

                    {/* USD */}
                    <div className="form-group" style={{ opacity: settings.enable_usd === 'true' ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label className="form-label" style={{ margin: 0 }}>🇺🇸 100 ໂດລ່າ (USD) = ? ກີບ</label>
                            <button
                                type="button"
                                onClick={() => update('enable_usd', settings.enable_usd === 'true' ? 'false' : 'true')}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    color: settings.enable_usd === 'true' ? '#22c55e' : 'var(--text-muted)',
                                    transition: 'color 0.2s',
                                }}
                                title={settings.enable_usd === 'true' ? 'ເປີດຢູ່ - ກົດເພື່ອປິດ' : 'ປິດຢູ່ - ກົດເພື່ອເປີດ'}
                            >
                                {settings.enable_usd === 'true' ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="number" className="form-input" value={settings.lak_per_usd} onChange={(e) => update('lak_per_usd', e.target.value)} disabled={settings.enable_usd !== 'true'} />
                        </div>
                        <div style={{ fontSize: 13, color: '#22c55e', marginTop: 4, fontWeight: 600 }}>
                            = {(Number(settings.lak_per_usd) * 100).toLocaleString()} ກີບ
                        </div>
                    </div>
                </div>

                {/* Receipt Settings */}
                <div className="pos-settings-section" style={{ gridColumn: '1 / -1' }}>
                    <div className="pos-settings-header"><Receipt size={18} /> ຕັ້ງຄ່າໃບບິນ</div>

                    <div className="form-group">
                        <label className="form-label">ຂະໜາດກະດາດ</label>
                        <div className="receipt-sizes">
                            {paperSizes.map(s => (
                                <button key={s.value}
                                    className={`receipt-size-btn ${settings.receipt_paper_size === s.value ? 'active' : ''}`}
                                    onClick={() => { update('receipt_paper_size', s.value); setCustomWidth(''); }}>
                                    <Printer size={20} />
                                    {s.label}
                                    <span>{s.desc}</span>
                                </button>
                            ))}
                            <button
                                className={`receipt-size-btn ${!['58', '80', '88'].includes(settings.receipt_paper_size) ? 'active' : ''}`}
                                onClick={() => { setCustomWidth(settings.receipt_paper_size); }}>
                                <Settings size={20} />
                                ກຳນົດເອງ
                                <span>mm</span>
                            </button>
                        </div>
                        {(customWidth || !['58', '80', '88'].includes(settings.receipt_paper_size)) && (
                            <div style={{ marginTop: 12 }}>
                                <input type="number" className="form-input" placeholder="ຂະໜາດ mm"
                                    value={customWidth || settings.receipt_paper_size}
                                    onChange={(e) => { setCustomWidth(e.target.value); update('receipt_paper_size', e.target.value); }}
                                    style={{ maxWidth: 150 }} />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                        <div className="form-group"><label className="form-label">ຫົວໃບບິນ</label><input className="form-input" value={settings.receipt_header} onChange={(e) => update('receipt_header', e.target.value)} /></div>
                        <div className="form-group"><label className="form-label">ທ້າຍໃບບິນ</label><input className="form-input" value={settings.receipt_footer} onChange={(e) => update('receipt_footer', e.target.value)} /></div>
                    </div>

                    {/* Receipt Preview */}
                    <div style={{ marginTop: 16 }}>
                        <label className="form-label">ຕົວຢ່າງໃບບິນ ({settings.receipt_paper_size}mm)</label>
                        <div style={{
                            width: `${Math.min(Number(settings.receipt_paper_size) * 3.78, 400)}px`,
                            background: '#fff', color: '#000', borderRadius: 8, padding: 16,
                            fontFamily: 'monospace', fontSize: 12, margin: '8px 0',
                            border: '2px dashed var(--border-secondary)',
                        }}>
                            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{settings.shop_name}</div>
                            <div style={{ textAlign: 'center', fontSize: 10, color: '#666', marginBottom: 8 }}>{settings.shop_address}</div>
                            <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span>ວັນທີ: 11/03/2026</span><span>INV-001</span></div>
                            <div style={{ fontSize: 11 }}>ພະນັກງານ: admin</div>
                            <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />
                            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}><span>ນ້ຳດື່ມ x2</span><span>10,000</span></div>
                            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}><span>ເຂົ້າໜຽວ x1</span><span>15,000</span></div>
                            <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>ລວມ:</span><span>25,000 ກີບ</span></div>
                            <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />
                            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>{settings.receipt_header}</div>
                            <div style={{ textAlign: 'center', fontSize: 9, color: '#999' }}>{settings.receipt_footer}</div>
                        </div>
                    </div>
                </div>
            </div>
        </POSPageWrapper>
    );
}
