'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw, Plus, Upload, Trash2, Edit3, X, Save, Camera, ImageIcon } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    barcode: string;
    price: number;
    stock: number;
    category: string;
    image_path: string;
    created_at: string;
}

// Client-side image resize using canvas
function resizeImage(file: File, maxWidth = 800, quality = 0.85): Promise<Blob> {
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
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '', barcode: '', price: '', stock: '', category: '',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '5000' });
            if (search) params.set('search', search);
            const res = await fetch(`/api/products?${params}`);
            const json = await res.json();
            if (json.status === 'success') {
                setProducts(json.data.products);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const uploadImage = async (productId: number | string): Promise<string> => {
        if (!imageFile) return editingProduct?.image_path || '';

        setUploadingImage(true);
        try {
            const resized = await resizeImage(imageFile);
            const fd = new FormData();
            fd.append('file', resized, `product_${productId}.jpg`);
            fd.append('productId', String(productId));

            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const json = await res.json();
            if (json.status === 'success') {
                return json.data.path;
            } else {
                toast.error('ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
                return '';
            }
        } catch {
            toast.error('ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
            return '';
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        try {
            const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
            const method = editingProduct ? 'PUT' : 'POST';

            // First create/update product
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    barcode: formData.barcode,
                    price: parseFloat(formData.price),
                    stock: isEditing ? parseInt(formData.stock) : 0,
                    category: formData.category,
                    image_path: editingProduct?.image_path || '',
                }),
            });

            const json = await res.json();
            if (json.status === 'success') {
                const productId = editingProduct ? editingProduct.id : json.data.id;

                // If there's an image to upload, do it now
                if (imageFile) {
                    const imagePath = await uploadImage(productId);
                    if (imagePath) {
                        // Update the product with the image path
                        await fetch(`/api/products/${productId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image_path: imagePath }),
                        });
                    }
                }

                toast.success(editingProduct ? 'ອັບເດດສິນຄ້າສຳເລັດ!' : 'ເພີ່ມສິນຄ້າສຳເລັດ!');
                setShowAddModal(false);
                setEditingProduct(null);
                setFormData({ name: '', barcode: '', price: '', stock: '', category: '' });
                setImageFile(null);
                setImagePreview(null);
                fetchProducts();
            } else {
                toast.error(json.message);
            }
        } catch (err) {
            toast.error('Failed to save product');
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສິນຄ້ານີ້?')) return;
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success('ລຶບສິນຄ້າສຳເລັດ');
                fetchProducts();
            } else {
                toast.error(json.message);
            }
        } catch {
            toast.error('Failed to delete product');
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsEditing(true);
        setFormData({
            name: product.name,
            barcode: product.barcode || '',
            price: product.price.toString(),
            stock: product.stock.toString(),
            category: product.category || '',
        });
        setImageFile(null);
        setImagePreview(product.image_path || null);
        setShowAddModal(true);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/import', { method: 'POST', body: fd });
            const json = await res.json();

            if (json.status === 'success') {
                toast.success(json.message);
                fetchProducts();
            } else {
                toast.error(json.message);
            }
        } catch {
            toast.error('Import failed');
        } finally {
            setImportLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const openAddModal = () => {
        setEditingProduct(null);
        setIsEditing(false);
        setFormData({ name: '', barcode: '', price: '', stock: '', category: '' });
        setImageFile(null);
        setImagePreview(null);
        setShowAddModal(true);
    };

    return (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <h1>📦 Products</h1>
                <div className="flex gap-2">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        ref={fileInputRef}
                        onChange={handleImport}
                        style={{ display: 'none' }}
                    />
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importLoading}
                    >
                        <Upload size={14} />
                        {importLoading ? 'Importing...' : 'Import Excel'}
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        style={{ width: 'auto' }}
                        onClick={openAddModal}
                    >
                        <Plus size={14} />
                        Add Product
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={fetchProducts}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <input
                    className="form-input"
                    placeholder="ຄົ້ນຫາສິນຄ້າ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 400 }}
                />
            </div>

            {/* Products Table */}
            {loading ? (
                <div className="empty-state"><div className="empty-state-text">Loading products...</div></div>
            ) : products.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <div className="empty-state-text">No products found</div>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>ຮູບ</th>
                                <th>Name</th>
                                <th>Barcode</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Category</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id}>
                                    <td>
                                        {product.image_path ? (
                                            <img
                                                src={product.image_path}
                                                alt={product.name}
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    objectFit: 'cover',
                                                    borderRadius: 8,
                                                    border: '2px solid rgba(255,255,255,0.08)',
                                                    background: '#1a1a2e',
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 8,
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '2px dashed rgba(255,255,255,0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'rgba(255,255,255,0.2)',
                                            }}>
                                                <ImageIcon size={18} />
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{product.name}</td>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 13 }}>
                                        {product.barcode || '—'}
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>
                                        ₭{product.price.toLocaleString()}
                                    </td>
                                    <td>
                                        <span className={`badge ${product.stock > 10 ? 'badge-success' : product.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{product.category || '—'}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(product)}>
                                                <Edit3 size={14} />
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(product.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                            <h2 className="modal-title" style={{ marginBottom: 0 }}>
                                {editingProduct ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າ'}
                            </h2>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Image Upload Section */}
                        <div style={{
                            marginBottom: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <div
                                onClick={() => imageInputRef.current?.click()}
                                style={{
                                    width: '100%',
                                    maxWidth: 200,
                                    aspectRatio: '1',
                                    borderRadius: 16,
                                    border: imagePreview ? '3px solid rgba(99,102,241,0.4)' : '3px dashed rgba(255,255,255,0.15)',
                                    background: imagePreview ? 'transparent' : 'rgba(255,255,255,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                }}
                            >
                                {imagePreview ? (
                                    <>
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(0,0,0,0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                        }}
                                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                                        >
                                            <Camera size={28} style={{ color: 'white' }} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={32} style={{ color: 'rgba(255,255,255,0.25)', marginBottom: 8 }} />
                                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>ກົດເພື່ອເພີ່ມຮູບ</span>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>ຖ່າຍຮູບ ຫຼື ເລືອກຈາກໄຟລ໌</span>
                                    </>
                                )}
                            </div>

                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageSelect}
                                style={{ display: 'none' }}
                            />

                            {imagePreview && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImageFile(null);
                                        setImagePreview(null);
                                    }}
                                    style={{
                                        fontSize: 12,
                                        color: '#ef4444',
                                        background: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: 8,
                                        padding: '4px 14px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ລຶບຮູບ
                                </button>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">ຊື່ສິນຄ້າ *</label>
                            <input
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="ຊື່ສິນຄ້າ"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">ບາໂຄ້ດ</label>
                            <input
                                className="form-input"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                placeholder="Barcode"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">ລາຄາ *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                            {isEditing && (
                                <div className="form-group">
                                    <label className="form-label">ສະຕ໋ອກ (ອ່ານຢ່າງດຽວ)</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        value={formData.stock}
                                        readOnly
                                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">ໝວດໝູ່</label>
                            <input
                                className="form-input"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Category"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>ຍົກເລີກ</button>
                            <button
                                className="btn btn-success"
                                onClick={handleSave}
                                disabled={!formData.name || !formData.price || uploadingImage}
                            >
                                <Save size={16} />
                                {uploadingImage ? 'ກຳລັງອັບໂຫຼດ...' : editingProduct ? 'ອັບເດດ' : 'ສ້າງ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
