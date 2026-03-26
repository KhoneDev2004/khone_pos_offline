'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import ConfirmModal from '@/app/components/ConfirmModal';
import ImageCropper from '@/app/components/ImageCropper';
import { Package, Plus, Search, Edit, Trash2, X, DollarSign, TrendingUp, Wand2, AlertTriangle, XCircle, Filter, CheckCircle, ArrowRight, Info, Camera, ImageIcon } from 'lucide-react';

interface Product { id: number; name: string; barcode: string; price: number; cost_price: number; stock: number; category: string; unit: string; image_path: string; }

interface RecentlyAdded { name: string; barcode: string; price: number; }

// Client-side image resize using canvas
function resizeImage(file: File | Blob, maxWidth = 800, quality = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas not supported'));
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
                'image/jpeg', quality
            );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file instanceof Blob ? file : file);
    });
}

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<{ name: string }[]>([]);
    const [units, setUnits] = useState<{ name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', barcode: '', price: '', cost_price: '', category: '', unit: '' });
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [recentlyAdded, setRecentlyAdded] = useState<RecentlyAdded[]>([]);
    const [saving, setSaving] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<Blob | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    // Cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState('');

    // Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

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

    // Camera functions
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    const startCamera = useCallback(async (deviceId?: string) => {
        setCameraError(null);
        try {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

            const constraints: MediaStreamConstraints = {
                video: {
                    width: { ideal: 1280 }, height: { ideal: 720 },
                    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
                },
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
            setCameraDevices(videoDevices);
            if (!deviceId && videoDevices.length > 0) setSelectedCameraId(videoDevices[0].deviceId);
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (msg.includes('NotAllowed') || msg.includes('Permission')) setCameraError('ກະລຸນາອະນຸຍາດໃຫ້ເຂົ້າເຖິງກ້ອງ');
            else if (msg.includes('NotFound')) setCameraError('ບໍ່ພົບກ້ອງໃນອຸປະກອນນີ້');
            else if (msg.includes('NotReadable')) setCameraError('ກ້ອງຖືກໃຊ້ງານຢູ່ແລ້ວ');
            else setCameraError('ເປີດກ້ອງບໍ່ສຳເລັດ');
        }
    }, []);

    const openCamera = useCallback(async () => {
        setShowCamera(true);
        setCameraError(null);
        // Small delay to let the modal render the video element
        setTimeout(() => startCamera(selectedCameraId || undefined), 100);
    }, [startCamera, selectedCameraId]);

    const closeCamera = useCallback(() => {
        stopCamera();
        setShowCamera(false);
        setCameraError(null);
    }, [stopCamera]);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) {
                setImageFile(blob);
                setImagePreview(URL.createObjectURL(blob));
                closeCamera();
            }
        }, 'image/jpeg', 0.92);
    }, [closeCamera]);

    const switchCamera = useCallback(async () => {
        const idx = cameraDevices.findIndex(d => d.deviceId === selectedCameraId);
        const next = cameraDevices[(idx + 1) % cameraDevices.length];
        if (next) {
            setSelectedCameraId(next.deviceId);
            await startCamera(next.deviceId);
        }
    }, [cameraDevices, selectedCameraId, startCamera]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
    }, []);
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

    const resetAddForm = () => {
        setForm({ name: '', barcode: '', price: '', cost_price: '', category: form.category, unit: form.unit });
        setImageFile(null);
        setImagePreview(null);
    };

    const openAdd = () => {
        setEditProduct(null);
        setRecentlyAdded([]);
        setForm({ name: '', barcode: '', price: '', cost_price: '', category: '', unit: '' });
        setImageFile(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditProduct(null);
        setRecentlyAdded([]);
        if (recentlyAdded.length > 0) {
            fetchProducts();
        }
    };

    const openEdit = (p: Product) => {
        setEditProduct(p);
        setRecentlyAdded([]);
        setForm({
            name: p.name, barcode: p.barcode || '', price: String(p.price),
            cost_price: String(p.cost_price || 0),
            category: p.category || '', unit: p.unit || ''
        });
        setImageFile(null);
        setImagePreview(p.image_path || null);
        setShowModal(true);
    };

    // Upload image and return path
    const uploadProductImage = async (productId: number | string): Promise<string> => {
        if (!imageFile) return '';
        setUploadingImage(true);
        try {
            const resized = await resizeImage(imageFile);
            const fd = new FormData();
            fd.append('file', resized, `product_${productId}.jpg`);
            fd.append('productId', String(productId));
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const json = await res.json();
            if (json.status === 'success') return json.data.path;
            toast.error('ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
            return '';
        } catch {
            toast.error('ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
            return '';
        } finally {
            setUploadingImage(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Load file to cropper
        const reader = new FileReader();
        reader.onloadend = () => {
            setCropImageSrc(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
        
        // Reset input value so same file can be selected again
        e.target.value = '';
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        setImageFile(croppedBlob);
        setImagePreview(URL.createObjectURL(croppedBlob));
        setShowCropper(false);
    };

    // Save product — for add mode: stock=0 always; for edit mode: don't change stock
    const handleSave = async (continueAdding: boolean = false) => {
        if (!form.name || !form.price) { toast.error('ກະລຸນາປ້ອນຊື່ ແລະ ລາຄາ'); return; }
        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                name: form.name, barcode: form.barcode,
                price: Number(form.price), cost_price: Number(form.cost_price || 0),
                category: form.category, unit: form.unit
            };

            if (editProduct) {
                body.stock = editProduct.stock;
                body.image_path = editProduct.image_path || '';
            } else {
                body.stock = 0;
            }

            const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
            const method = editProduct ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const json = await res.json();
            if (json.status === 'success') {
                const productId = editProduct ? editProduct.id : json.data.id;

                // Upload image if selected
                if (imageFile) {
                    const imagePath = await uploadProductImage(productId);
                    if (imagePath) {
                        await fetch(`/api/products/${productId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image_path: imagePath }),
                        });
                    }
                }

                if (editProduct) {
                    toast.success('ແກ້ໄຂສຳເລັດ');
                    setShowModal(false);
                    fetchProducts();
                } else {
                    toast.success(`ເພີ່ມ "${form.name}" ສຳເລັດ`);
                    setRecentlyAdded(prev => [{ name: form.name, barcode: form.barcode, price: Number(form.price) }, ...prev]);
                    if (continueAdding) {
                        resetAddForm();
                    } else {
                        setShowModal(false);
                        setRecentlyAdded([]);
                        fetchProducts();
                    }
                }
            } else toast.error(json.message);
        } catch { toast.error('ບັນທຶກລົ້ມເຫຼວ'); }
        setSaving(false);
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

    const isAddMode = !editProduct;

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
                            <th style={{ width: 50 }}>ຮູບ</th><th>#</th><th>ຊື່ສິນຄ້າ</th><th>ບາໂຄ້ດ</th><th>ໝວດໝູ່</th>
                            <th>ລາຄາທຶນ</th><th>ລາຄາຂາຍ</th><th>ກຳໄລ</th>
                            <th>ສະຕ໊ອກ</th><th>ຈັດການ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ກຳລັງໂຫຼດ...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ບໍ່ມີຂໍ້ມູນ</td></tr>
                        ) : filteredProducts.map((p) => (
                            <tr key={p.id} className={p.stock <= 0 ? 'prod-row-danger' : p.stock <= LOW_STOCK_THRESHOLD ? 'prod-row-warning' : ''}>
                                <td>
                                    {p.image_path ? (
                                        <img src={p.image_path} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, border: '2px solid rgba(255,255,255,0.08)', background: '#1a1a2e' }} />
                                    ) : (
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                            <ImageIcon size={16} />
                                        </div>
                                    )}
                                </td>
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
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 className="modal-title" style={{ marginBottom: 0 }}>
                                {editProduct ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າ'}
                                {isAddMode && recentlyAdded.length > 0 && (
                                    <span style={{ fontSize: 13, fontWeight: 400, color: '#22c55e', marginLeft: 8 }}>
                                        ✅ ເພີ່ມແລ້ວ {recentlyAdded.length} ລາຍການ
                                    </span>
                                )}
                            </h2>
                            <button className="btn btn-sm btn-secondary" onClick={closeModal} style={{ padding: '4px 8px' }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Info banner for add mode */}
                        {isAddMode && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                                background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.2)',
                                color: '#4fc3f7', fontSize: 12.5
                            }}>
                                <Info size={16} style={{ flexShrink: 0 }} />
                                <span>
                                    ສິນຄ້າໃໝ່ຈະເລີ່ມຕົ້ນດ້ວຍ ສະຕ໊ອກ = 0 — ຖ້າຕ້ອງການເພີ່ມຈຳນວນ
                                    <button
                                        onClick={() => { closeModal(); router.push('/pos/import'); }}
                                        style={{
                                            background: 'none', border: 'none', color: '#4fc3f7',
                                            textDecoration: 'underline', cursor: 'pointer', padding: '0 4px',
                                            fontWeight: 700, fontSize: 12.5
                                        }}
                                    >
                                        ໄປໜ້ານຳເຂົ້າສະຕ໊ອກ <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                    </button>
                                </span>
                            </div>
                        )}

                        {/* Image Upload Area */}
                        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            {imagePreview ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 180 }}>
                                    <div style={{
                                        width: '100%', aspectRatio: '1',
                                        borderRadius: 16, border: '3px solid rgba(99,102,241,0.4)',
                                        overflow: 'hidden', position: 'relative'
                                    }}>
                                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    
                                    {/* Action Buttons Below Image */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        gap: 12, marginTop: 12
                                    }}>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                                            title="ປ່ຽນຮູບ"
                                            style={{ 
                                                width: 40, height: 40, borderRadius: '50%',
                                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', 
                                                color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                                            title="ລຶບຮູບ"
                                            style={{ 
                                                width: 40, height: 40, borderRadius: '50%',
                                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', 
                                                color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 380 }}>
                                    {/* Camera button */}
                                    <div
                                        onClick={openCamera}
                                        className="cam-pick-btn"
                                    >
                                        <Camera size={28} />
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>ເປີດກ້ອງ</span>
                                        <span style={{ fontSize: 10, opacity: 0.6 }}>ຖ່າຍຮູບສິນຄ້າ</span>
                                    </div>
                                    {/* File picker button */}
                                    <div
                                        onClick={() => imageInputRef.current?.click()}
                                        className="cam-pick-btn"
                                    >
                                        <ImageIcon size={28} />
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>ເລືອກຮູບ</span>
                                        <span style={{ fontSize: 10, opacity: 0.6 }}>ຈາກໄຟລ໌</span>
                                    </div>
                                </div>
                            )}
                            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">ຊື່ສິນຄ້າ *</label>
                            <input className="form-input" value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="ປ້ອນຊື່ສິນຄ້າ"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ບາໂຄ້ດ</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="form-input" value={form.barcode}
                                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                    placeholder="ປ້ອນບາໂຄ້ດ ຫຼື ກົດສ້າງໃໝ່"
                                    style={{ flex: 1, fontFamily: 'monospace' }} />
                                <button className="btn btn-sm btn-secondary" type="button"
                                    onClick={() => setForm({ ...form, barcode: generateBarcode() })}
                                    title="ສ້າງບາໂຄ້ດອັດຕະໂນມັດ"
                                    style={{ whiteSpace: 'nowrap' }}>
                                    <Wand2 size={14} /> ສ້າງໃໝ່
                                </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                💡 ປ້ອນບາໂຄ້ດເອງ ຫຼື ກົດ "ສ້າງໃໝ່" ເພື່ອສ້າງອັດຕະໂນມັດ
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label"><DollarSign size={12} style={{ display: 'inline' }} /> ລາຄາທຶນ</label>
                                <input type="number" className="form-input" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label"><TrendingUp size={12} style={{ display: 'inline' }} /> ລາຄາຂາຍ *</label>
                                <input type="number" className="form-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                            </div>
                        </div>
                        {form.price && form.cost_price && (
                            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                                ກຳໄລ: {(Number(form.price) - Number(form.cost_price)).toLocaleString()} ກີບ ({form.cost_price && Number(form.cost_price) > 0 ? ((Number(form.price) - Number(form.cost_price)) / Number(form.cost_price) * 100).toFixed(1) : '0'}%)
                            </div>
                        )}

                        {/* Stock field — only visible in edit mode, and read-only */}
                        {editProduct && (
                            <div className="form-group">
                                <label className="form-label">ສະຕ໊ອກ (ບໍ່ສາມາດແກ້ໄຂຈາກບ່ອນນີ້)</label>
                                <input type="number" className="form-input" value={editProduct.stock} readOnly
                                    style={{ opacity: 0.6, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' }}
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    💡 ເພື່ອແກ້ໄຂຈຳນວນສະຕ໊ອກ → ໄປໜ້ານຳເຂົ້າສະຕ໊ອກ
                                </div>
                            </div>
                        )}

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

                        {/* Recently added items list */}
                        {isAddMode && recentlyAdded.length > 0 && (
                            <div style={{
                                marginTop: 4, marginBottom: 12, padding: '10px 14px',
                                borderRadius: 10, background: 'rgba(34,197,94,0.06)',
                                border: '1px solid rgba(34,197,94,0.15)',
                                maxHeight: 140, overflowY: 'auto'
                            }}>
                                <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle size={14} /> ສິນຄ້າທີ່ພຶ່ງເພີ່ມ ({recentlyAdded.length})
                                </div>
                                {recentlyAdded.map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '5px 0', borderBottom: i < recentlyAdded.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                        fontSize: 12.5, color: 'var(--text-secondary)'
                                    }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                                        <span style={{ color: '#4fc3f7', fontWeight: 600 }}>₭{item.price.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="modal-actions" style={{ gap: 8 }}>
                            <button className="btn btn-secondary" onClick={closeModal} disabled={saving || uploadingImage}>ປິດ</button>
                            {isAddMode ? (
                                <>
                                    <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={saving || uploadingImage || !form.name || !form.price}
                                        style={{ flex: 1 }}
                                    >
                                        <Plus size={16} /> {uploadingImage ? 'ກຳລັງອັບໂຫຼດ...' : 'ເພີ່ມ ແລະ ປິດ'}
                                    </button>
                                    <button className="btn btn-success" onClick={() => handleSave(true)} disabled={saving || uploadingImage || !form.name || !form.price}
                                        style={{ flex: 1 }}
                                    >
                                        <Plus size={16} /> {uploadingImage ? 'ກຳລັງອັບໂຫຼດ...' : 'ເພີ່ມ ແລະ ເພີ່ມຕໍ່'}
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-success" onClick={() => handleSave(false)} disabled={saving || uploadingImage || !form.name || !form.price}>
                                    {uploadingImage ? 'ກຳລັງອັບໂຫຼດ...' : 'ບັນທຶກ'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Modal */}
            {showCamera && (
                <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={closeCamera}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Camera size={18} style={{ color: 'var(--accent-primary)' }} /> ຖ່າຍຮູບສິນຄ້າ
                            </h3>
                            <button className="btn btn-sm btn-secondary" onClick={closeCamera} style={{ padding: '4px 8px' }}>
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000' }}>
                            {cameraError ? (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--accent-danger)' }}>
                                    <Camera size={40} />
                                    <p style={{ fontSize: 14 }}>{cameraError}</p>
                                    <button className="btn btn-sm btn-secondary" onClick={() => startCamera(selectedCameraId || undefined)}>ລອງໃໝ່</button>
                                </div>
                            ) : (
                                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                        </div>

                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
                            {cameraDevices.length > 1 && (
                                <button className="btn btn-sm btn-secondary" onClick={switchCamera}>
                                    🔄 ສະລັບກ້ອງ
                                </button>
                            )}
                            <button
                                onClick={capturePhoto}
                                className="camera-capture-btn"
                                title="ຖ່າຍຮູບ"
                            >
                                <div className="camera-capture-btn-inner" />
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={closeCamera}>
                                ຍົກເລີກ
                            </button>
                        </div>

                        {cameraDevices.length > 1 && (
                            <div style={{ padding: '0 16px 12px' }}>
                                <select
                                    className="form-input"
                                    value={selectedCameraId}
                                    onChange={(e) => { setSelectedCameraId(e.target.value); startCamera(e.target.value); }}
                                    style={{ fontSize: 12, padding: '6px 10px' }}
                                >
                                    {cameraDevices.map((d, i) => (
                                        <option key={d.deviceId} value={d.deviceId}>
                                            {d.label || `ກ້ອງ ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showCropper && (
                <ImageCropper
                    imageSrc={cropImageSrc}
                    aspectRatio={1} // Square crop for products
                    maxOutputSize={300} // Compress to <= 300KB
                    onCropComplete={handleCropComplete}
                    onCancel={() => setShowCropper(false)}
                />
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
