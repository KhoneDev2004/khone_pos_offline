'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw, Plus, Upload, Trash2, Edit3, X, Save } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    barcode: string;
    price: number;
    stock: number;
    category: string;
    created_at: string;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '', barcode: '', price: '', stock: '', category: '',
    });

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

    const handleSave = async () => {
        try {
            const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    barcode: formData.barcode,
                    price: parseFloat(formData.price),
                    stock: parseInt(formData.stock),
                    category: formData.category,
                }),
            });

            const json = await res.json();
            if (json.status === 'success') {
                toast.success(editingProduct ? 'Product updated!' : 'Product created!');
                setShowAddModal(false);
                setEditingProduct(null);
                setFormData({ name: '', barcode: '', price: '', stock: '', category: '' });
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
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success('Product deleted');
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
        setFormData({
            name: product.name,
            barcode: product.barcode || '',
            price: product.price.toString(),
            stock: product.stock.toString(),
            category: product.category || '',
        });
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
                        onClick={() => {
                            setEditingProduct(null);
                            setFormData({ name: '', barcode: '', price: '', stock: '', category: '' });
                            setShowAddModal(true);
                        }}
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
                    placeholder="Search products..."
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
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                            <h2 className="modal-title" style={{ marginBottom: 0 }}>
                                {editingProduct ? 'Edit Product' : 'Add Product'}
                            </h2>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Name *</label>
                            <input
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Product name"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Barcode</label>
                            <input
                                className="form-input"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                placeholder="Barcode"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Price *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Stock</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <input
                                className="form-input"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Category"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="btn btn-success" onClick={handleSave} disabled={!formData.name || !formData.price}>
                                <Save size={16} />
                                {editingProduct ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
