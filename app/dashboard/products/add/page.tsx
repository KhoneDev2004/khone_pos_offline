'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
    Camera, X, Save, ArrowLeft, RotateCcw,
    Upload, Trash2, Video, VideoOff, SwitchCamera,
    Package, Check
} from 'lucide-react';
import Link from 'next/link';

interface CategoryItem {
    id: number | null;
    name: string;
}

interface UnitItem {
    id: number;
    name: string;
    abbreviation: string;
}

// Client-side image resize using canvas
function resizeImage(blob: Blob, maxWidth = 800, quality = 0.85): Promise<Blob> {
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
                (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(blob);
    });
}

export default function AddProductPage() {
    // Form state
    const [formData, setFormData] = useState({
        name: '', barcode: '', price: '', cost_price: '', category: '', unit: '',
    });
    const [saving, setSaving] = useState(false);

    // Camera state
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Dropdown data
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [units, setUnits] = useState<UnitItem[]>([]);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch categories and units
    useEffect(() => {
        fetch('/api/categories')
            .then(r => r.json())
            .then(j => {
                if (j.status === 'success') setCategories(j.data.categories);
            })
            .catch(() => {});

        fetch('/api/units')
            .then(r => r.json())
            .then(j => {
                if (j.status === 'success') setUnits(j.data.units);
            })
            .catch(() => {});
    }, []);

    // Enumerate camera devices
    useEffect(() => {
        async function getDevices() {
            try {
                // Request permission first to get labeled devices
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                tempStream.getTracks().forEach(t => t.stop());
                
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
                setDevices(videoDevices);
                if (videoDevices.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(videoDevices[0].deviceId);
                }
            } catch {
                console.log('Cannot enumerate devices yet');
            }
        }
        getDevices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Start camera
    const startCamera = useCallback(async (deviceId?: string) => {
        setCameraError(null);
        try {
            // Stop existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
                },
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraActive(true);

            // Update devices list after permission granted
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
            setDevices(videoDevices);
            if (!deviceId && videoDevices.length > 0) {
                setSelectedDeviceId(videoDevices[0].deviceId);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'ເປີດກ້ອງບໍ່ສຳເລັດ';
            setCameraError(msg);
            setCameraActive(false);
            
            if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
                setCameraError('ກະລຸນາອະນຸຍາດໃຫ້ເຂົ້າເຖິງກ້ອງ');
            } else if (msg.includes('NotFoundError')) {
                setCameraError('ບໍ່ພົບກ້ອງໃນອຸປະກອນນີ້');
            } else if (msg.includes('NotReadableError')) {
                setCameraError('ກ້ອງຖືກໃຊ້ງານຢູ່ແລ້ວ');
            }
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    }, []);

    // Switch camera
    const switchCamera = useCallback(async () => {
        const currentIdx = devices.findIndex(d => d.deviceId === selectedDeviceId);
        const nextIdx = (currentIdx + 1) % devices.length;
        const nextDevice = devices[nextIdx];
        if (nextDevice) {
            setSelectedDeviceId(nextDevice.deviceId);
            await startCamera(nextDevice.deviceId);
        }
    }, [devices, selectedDeviceId, startCamera]);

    // Capture photo from camera
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
                setCapturedBlob(blob);
                setCapturedImage(URL.createObjectURL(blob));
                // Stop camera after capture
                stopCamera();
            }
        }, 'image/jpeg', 0.92);
    }, [stopCamera]);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCapturedBlob(file);
        const reader = new FileReader();
        reader.onloadend = () => setCapturedImage(reader.result as string);
        reader.readAsDataURL(file);
        stopCamera();
    };

    // Clear captured image
    const clearCapture = () => {
        setCapturedImage(null);
        setCapturedBlob(null);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Upload image
    const uploadImage = async (productId: number | string): Promise<string> => {
        if (!capturedBlob) return '';

        setUploadingImage(true);
        try {
            const resized = await resizeImage(capturedBlob);
            const fd = new FormData();
            fd.append('file', resized, `product_${productId}.jpg`);
            fd.append('productId', String(productId));

            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const json = await res.json();
            if (json.status === 'success') {
                return json.data.path;
            }
            toast.error('ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
            return '';
        } catch {
            toast.error('ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
            return '';
        } finally {
            setUploadingImage(false);
        }
    };

    // Save product
    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            toast.error('ກະລຸນາກອກຊື່ ແລະ ລາຄາ');
            return;
        }

        setSaving(true);
        try {
            // 1. Create product
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    barcode: formData.barcode,
                    price: parseFloat(formData.price),
                    cost_price: parseFloat(formData.cost_price) || 0,
                    stock: 0,
                    category: formData.category,
                    unit: formData.unit,
                    image_path: '',
                }),
            });

            const json = await res.json();
            if (json.status === 'success') {
                const productId = json.data.id;

                // 2. Upload image if captured
                if (capturedBlob) {
                    const imagePath = await uploadImage(productId);
                    if (imagePath) {
                        await fetch(`/api/products/${productId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image_path: imagePath }),
                        });
                    }
                }

                toast.success('ເພີ່ມສິນຄ້າສຳເລັດ!');

                // Reset form
                setFormData({ name: '', barcode: '', price: '', cost_price: '', category: '', unit: '' });
                clearCapture();
            } else {
                toast.error(json.message || 'ບໍ່ສາມາດບັນທຶກສິນຄ້າໄດ້');
            }
        } catch (err) {
            console.error(err);
            toast.error('ເກີດຂໍ້ຜິດພາດ');
        } finally {
            setSaving(false);
        }
    };

    // Check if accessed from secure context (HTTPS or localhost)
    const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

    return (
        <div className="dashboard-content" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
            {/* Header */}
            <div className="add-product-header">
                <div className="add-product-header-left">
                    <Link href="/dashboard/products" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                        <ArrowLeft size={16} />
                        ກັບຄືນ
                    </Link>
                    <h1>
                        <Package size={24} style={{ color: 'var(--accent-primary)' }} />
                        ເພີ່ມສິນຄ້າໃໝ່
                    </h1>
                </div>
                <button
                    className="btn btn-success"
                    onClick={handleSave}
                    disabled={!formData.name || !formData.price || saving || uploadingImage}
                    style={{ minWidth: 160 }}
                >
                    {saving || uploadingImage ? (
                        <>
                            <div className="add-product-spinner" />
                            ກຳລັງບັນທຶກ...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            ບັນທຶກສິນຄ້າ
                        </>
                    )}
                </button>
            </div>

            {/* Main content: 2-column layout */}
            <div className="add-product-body">
                {/* LEFT: Camera section */}
                <div className="add-product-camera-col">
                    <div className="camera-card">
                        <div className="camera-card-header">
                            <h3><Camera size={18} /> ຖ່າຍຮູບສິນຄ້າ</h3>
                            {!isSecureContext && (
                                <span className="camera-warning-badge">
                                    ⚠ ຕ້ອງໃຊ້ HTTPS ເພື່ອເປີດກ້ອງ
                                </span>
                            )}
                        </div>

                        <div className="camera-viewport">
                            {capturedImage ? (
                                /* Show captured image */
                                <div className="camera-captured">
                                    <img src={capturedImage} alt="Captured" />
                                    <div className="camera-captured-overlay">
                                        <Check size={32} />
                                        <span>ຖ່າຍຮູບແລ້ວ</span>
                                    </div>
                                </div>
                            ) : cameraActive ? (
                                /* Show live video */
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="camera-video"
                                />
                            ) : (
                                /* Show placeholder */
                                <div className="camera-placeholder">
                                    {cameraError ? (
                                        <>
                                            <VideoOff size={48} />
                                            <p className="camera-error-text">{cameraError}</p>
                                            <button className="btn btn-secondary btn-sm" onClick={() => startCamera(selectedDeviceId)}>
                                                <RotateCcw size={14} /> ລອງໃໝ່
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Video size={48} />
                                            <p>ກົດປຸ່ມດ້ານລຸ່ມເພື່ອເປີດກ້ອງ</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Hidden canvas for capture */}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {/* Camera controls */}
                        <div className="camera-controls">
                            {capturedImage ? (
                                <>
                                    <button className="btn btn-danger btn-sm" onClick={clearCapture}>
                                        <Trash2 size={14} /> ລຶບຮູບ
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => { clearCapture(); startCamera(selectedDeviceId); }}>
                                        <RotateCcw size={14} /> ຖ່າຍໃໝ່
                                    </button>
                                </>
                            ) : cameraActive ? (
                                <>
                                    <button className="camera-capture-btn" onClick={capturePhoto}>
                                        <div className="camera-capture-btn-inner" />
                                    </button>
                                    {devices.length > 1 && (
                                        <button className="btn btn-secondary btn-sm" onClick={switchCamera}>
                                            <SwitchCamera size={14} /> ສະລັບກ້ອງ
                                        </button>
                                    )}
                                    <button className="btn btn-secondary btn-sm" onClick={stopCamera}>
                                        <X size={14} /> ປິດກ້ອງ
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="btn btn-primary" onClick={() => startCamera(selectedDeviceId)} style={{ flex: 1 }}>
                                        <Camera size={16} /> ເປີດກ້ອງ
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ flex: 1 }}>
                                        <Upload size={16} /> ເລືອກຈາກໄຟລ໌
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Device selector */}
                        {cameraActive && devices.length > 1 && (
                            <div className="camera-device-select">
                                <select
                                    className="form-input"
                                    value={selectedDeviceId}
                                    onChange={(e) => { setSelectedDeviceId(e.target.value); startCamera(e.target.value); }}
                                    style={{ fontSize: 12, padding: '6px 10px' }}
                                >
                                    {devices.map((d, i) => (
                                        <option key={d.deviceId} value={d.deviceId}>
                                            {d.label || `ກ້ອງ ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                {/* RIGHT: Product form */}
                <div className="add-product-form-col">
                    <div className="product-form-card">
                        <h3 className="product-form-card-title">ຂໍ້ມູນສິນຄ້າ</h3>

                        <div className="form-group">
                            <label className="form-label">ຊື່ສິນຄ້າ *</label>
                            <input
                                id="product-name"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="ກະລຸນາກອກຊື່ສິນຄ້າ"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">ບາໂຄ້ດ</label>
                            <input
                                id="product-barcode"
                                className="form-input"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                placeholder="ສະແກນ ຫຼື ກອກບາໂຄ້ດ"
                            />
                        </div>

                        <div className="add-product-grid-2">
                            <div className="form-group">
                                <label className="form-label">ລາຄາຂາຍ (₭) *</label>
                                <input
                                    id="product-price"
                                    className="form-input"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">ລາຄາທຶນ (₭)</label>
                                <input
                                    id="product-cost-price"
                                    className="form-input"
                                    type="number"
                                    value={formData.cost_price}
                                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="add-product-grid-2">
                            <div className="form-group">
                                <label className="form-label">ໝວດໝູ່</label>
                                <select
                                    id="product-category"
                                    className="form-input"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="">— ເລືອກໝວດໝູ່ —</option>
                                    {categories.map((c) => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">ຫົວໜ່ວຍ</label>
                                <select
                                    id="product-unit"
                                    className="form-input"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="">— ເລືອກຫົວໜ່ວຍ —</option>
                                    {units.map((u) => (
                                        <option key={u.id} value={u.name}>{u.name} ({u.abbreviation})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Preview card */}
                    {(formData.name || capturedImage) && (
                        <div className="product-preview-card">
                            <h4>ຕົວຢ່າງສິນຄ້າ</h4>
                            <div className="product-preview-item">
                                <div className="product-preview-image">
                                    {capturedImage ? (
                                        <img src={capturedImage} alt="Preview" />
                                    ) : (
                                        <Package size={24} style={{ color: 'var(--text-muted)' }} />
                                    )}
                                </div>
                                <div className="product-preview-info">
                                    <div className="product-preview-name">{formData.name || 'ຊື່ສິນຄ້າ'}</div>
                                    {formData.barcode && (
                                        <div className="product-preview-barcode">{formData.barcode}</div>
                                    )}
                                    <div className="product-preview-price">
                                        ₭{formData.price ? parseFloat(formData.price).toLocaleString() : '0'}
                                    </div>
                                    {formData.category && (
                                        <span className="badge badge-info" style={{ fontSize: 11 }}>{formData.category}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
