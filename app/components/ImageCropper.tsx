'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, RotateCcw, ZoomIn, ZoomOut, Check, X, Move } from 'lucide-react';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
    aspectRatio?: number; // e.g., 1 for square, 0 for free
    maxOutputSize?: number; // max KB for output
}

export default function ImageCropper({
    imageSrc,
    onCropComplete,
    onCancel,
    aspectRatio = 1,
    maxOutputSize = 300, // default 300KB max
}: ImageCropperProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [imgLoaded, setImgLoaded] = useState(false);
    const [scale, setScale] = useState(1);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [cropSize, setCropSize] = useState(240);

    const CANVAS_SIZE = 300;

    // Load image
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            // Fit image to canvas
            const minDim = Math.min(img.width, img.height);
            const fitScale = CANVAS_SIZE / minDim;
            setScale(fitScale);
            setOffsetX((CANVAS_SIZE - img.width * fitScale) / 2);
            setOffsetY((CANVAS_SIZE - img.height * fitScale) / 2);
            setCropSize(Math.min(CANVAS_SIZE - 20, 260));
            setImgLoaded(true);
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // Draw canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw image
        ctx.save();
        ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
        ctx.restore();

        // Draw dark overlay outside crop area
        const cropX = (CANVAS_SIZE - cropSize) / 2;
        const cropY = (CANVAS_SIZE - cropSize) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        // Top
        ctx.fillRect(0, 0, CANVAS_SIZE, cropY);
        // Bottom
        ctx.fillRect(0, cropY + cropSize, CANVAS_SIZE, CANVAS_SIZE - cropY - cropSize);
        // Left
        ctx.fillRect(0, cropY, cropX, cropSize);
        // Right
        ctx.fillRect(cropX + cropSize, cropY, CANVAS_SIZE - cropX - cropSize, cropSize);

        // Crop border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(cropX, cropY, cropSize, cropSize);

        // Grid lines (rule of thirds)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
            // Vertical
            ctx.beginPath();
            ctx.moveTo(cropX + (cropSize / 3) * i, cropY);
            ctx.lineTo(cropX + (cropSize / 3) * i, cropY + cropSize);
            ctx.stroke();
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(cropX, cropY + (cropSize / 3) * i);
            ctx.lineTo(cropX + cropSize, cropY + (cropSize / 3) * i);
            ctx.stroke();
        }

        // Corner handles
        const handleSize = 16;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        const corners = [
            [cropX, cropY],
            [cropX + cropSize, cropY],
            [cropX, cropY + cropSize],
            [cropX + cropSize, cropY + cropSize],
        ];
        corners.forEach(([cx, cy]) => {
            ctx.beginPath();
            ctx.moveTo(cx - (cx === cropX ? 0 : handleSize), cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy - (cy === cropY ? 0 : handleSize));
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx + (cx === cropX ? handleSize : 0), cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + (cy === cropY ? handleSize : 0));
            ctx.stroke();
        });
    }, [offsetX, offsetY, scale, cropSize]);

    useEffect(() => {
        if (imgLoaded) draw();
    }, [imgLoaded, draw]);

    // Mouse/Touch handlers for dragging
    const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return { x: 0, y: 0 };
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const pos = getEventPos(e);
        setDragging(true);
        setDragStart({ x: pos.x - offsetX, y: pos.y - offsetY });
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragging) return;
        e.preventDefault();
        const pos = getEventPos(e);
        setOffsetX(pos.x - dragStart.x);
        setOffsetY(pos.y - dragStart.y);
    };

    const handleEnd = () => setDragging(false);

    // Zoom
    const handleZoom = (delta: number) => {
        const newScale = Math.max(0.1, Math.min(5, scale + delta));
        // Zoom towards center
        const img = imgRef.current;
        if (!img) return;
        const centerX = CANVAS_SIZE / 2;
        const centerY = CANVAS_SIZE / 2;
        const newOffsetX = centerX - ((centerX - offsetX) / scale) * newScale;
        const newOffsetY = centerY - ((centerY - offsetY) / scale) * newScale;
        setScale(newScale);
        setOffsetX(newOffsetX);
        setOffsetY(newOffsetY);
    };

    const resetTransform = () => {
        const img = imgRef.current;
        if (!img) return;
        const minDim = Math.min(img.width, img.height);
        const fitScale = CANVAS_SIZE / minDim;
        setScale(fitScale);
        setOffsetX((CANVAS_SIZE - img.width * fitScale) / 2);
        setOffsetY((CANVAS_SIZE - img.height * fitScale) / 2);
    };

    // Crop and compress
    const handleCrop = async () => {
        const img = imgRef.current;
        if (!img) return;

        const cropX = (CANVAS_SIZE - cropSize) / 2;
        const cropY = (CANVAS_SIZE - cropSize) / 2;

        // Create output canvas at desired resolution
        const outputSize = 600; // output 600x600px
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = outputSize;
        outputCanvas.height = outputSize;
        const ctx = outputCanvas.getContext('2d');
        if (!ctx) return;

        // Calculate what part of the source image is in the crop region
        const sourceX = (cropX - offsetX) / scale;
        const sourceY = (cropY - offsetY) / scale;
        const sourceW = cropSize / scale;
        const sourceH = cropSize / scale;

        ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outputSize, outputSize);

        // Compress iteratively until under maxOutputSize
        let quality = 0.9;
        let blob: Blob | null = null;

        while (quality > 0.1) {
            blob = await new Promise<Blob | null>((resolve) =>
                outputCanvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
            );
            if (blob && blob.size <= maxOutputSize * 1024) break;
            quality -= 0.1;
        }

        if (blob) {
            onCropComplete(blob);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }}
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div style={{
                background: '#1a1a2e',
                borderRadius: 20,
                padding: 20,
                maxWidth: 380,
                width: '100%',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>
                        <Crop size={18} />
                        ຕັດ ແລະ ປັບຮູບ
                    </div>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Canvas */}
                <div
                    ref={containerRef}
                    style={{
                        width: CANVAS_SIZE,
                        height: CANVAS_SIZE,
                        margin: '0 auto',
                        borderRadius: 12,
                        overflow: 'hidden',
                        cursor: dragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                        border: '2px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        onMouseDown={handleStart}
                        onMouseMove={handleMove}
                        onMouseUp={handleEnd}
                        onMouseLeave={handleEnd}
                        onTouchStart={handleStart}
                        onTouchMove={handleMove}
                        onTouchEnd={handleEnd}
                        style={{ display: 'block', width: '100%', height: '100%' }}
                    />
                </div>

                {/* Hint */}
                <div style={{
                    textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                    <Move size={12} /> ລາກເພື່ອຍ້າຍຮູບ ● ໃຊ້ປຸ່ມ +/- ເພື່ອຊູມ
                </div>

                {/* Controls */}
                <div style={{
                    display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12,
                }}>
                    <button onClick={() => handleZoom(-0.15)} style={btnStyle}>
                        <ZoomOut size={16} />
                    </button>
                    <button onClick={resetTransform} style={btnStyle}>
                        <RotateCcw size={16} />
                    </button>
                    <button onClick={() => handleZoom(0.15)} style={btnStyle}>
                        <ZoomIn size={16} />
                    </button>
                </div>

                {/* Size info */}
                <div style={{
                    textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 10,
                    background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: 8,
                }}>
                    📐 ຮູບທີ່ crop ຈະຖືກບີບອັດໃຫ້ ≤ {maxOutputSize}KB ອັດຕະໂນມັດ
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={onCancel} style={{
                        flex: 1, padding: '10px 16px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                        ຍົກເລີກ
                    </button>
                    <button onClick={handleCrop} style={{
                        flex: 1, padding: '10px 16px', borderRadius: 10,
                        background: '#6366f1', border: '1px solid #818cf8',
                        color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                        <Check size={16} /> ຕັດ ແລະ ໃຊ້ຮູບນີ້
                    </button>
                </div>
            </div>
        </div>
    );
}

const btnStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
