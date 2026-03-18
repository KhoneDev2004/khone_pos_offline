'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Package, Search } from 'lucide-react';
import { Product } from '@/app/hooks/useProducts';

interface ProductListProps {
    products: Product[];
    loading: boolean;
    onAddToCart: (product: Product) => void;
    onSearch: (query: string) => void;
}

const COLUMN_COUNT = 4;
const CARD_HEIGHT = 200;
const GAP = 12;

export default function ProductList({ products, loading, onAddToCart, onSearch }: ProductListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.barcode && p.barcode.toLowerCase().includes(q))
        );
    }, [products, searchQuery]);

    const handleSearch = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setSearchQuery(value);
            onSearch(value);
        },
        [onSearch]
    );

    const containerWidth = containerRef?.clientWidth || 800;
    const containerHeight = containerRef?.clientHeight || 600;
    const columnWidth = (containerWidth - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;
    const rowCount = Math.ceil(filteredProducts.length / COLUMN_COUNT);

    const Cell = useCallback(
        ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
            const index = rowIndex * COLUMN_COUNT + columnIndex;
            if (index >= filteredProducts.length) return null;

            const product = filteredProducts[index];
            const stockClass = product.stock <= 0 ? 'stock-out' : product.stock <= 10 ? 'stock-low' : 'stock-ok';

            return (
                <div
                    style={{
                        ...style,
                        left: Number(style.left) + columnIndex * GAP,
                        top: Number(style.top) + rowIndex * GAP,
                        width: Number(style.width) - GAP,
                        height: Number(style.height) - GAP,
                    }}
                >
                    <div
                        className="product-card"
                        onClick={() => product.stock > 0 && onAddToCart(product)}
                        style={{
                            height: '100%',
                            opacity: product.stock <= 0 ? 0.5 : 1,
                            cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <div className="product-card-image">
                            {product.image_path ? (
                                <img
                                    src={product.image_path}
                                    alt={product.name}
                                    loading="lazy"
                                />
                            ) : (
                                <Package size={28} />
                            )}
                        </div>
                        <div className="product-card-name" title={product.name}>
                            {product.name}
                        </div>
                        {product.barcode && (
                            <div className="product-card-barcode">{product.barcode}</div>
                        )}
                        <div className="product-card-footer">
                            <span className="product-card-price">
                                ₭{product.price.toLocaleString()}
                            </span>
                            <span className={`product-card-stock ${stockClass}`}>
                                {product.stock <= 0 ? 'Out' : product.stock}
                            </span>
                        </div>
                    </div>
                </div>
            );
        },
        [filteredProducts, onAddToCart]
    );

    return (
        <>
            <div className="search-container">
                <Search className="search-icon" size={20} />
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search products by name or barcode..."
                    value={searchQuery}
                    onChange={handleSearch}
                    autoFocus
                />
            </div>

            <div style={{ flex: 1, position: 'relative' }} ref={setContainerRef}>
                {loading ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">⏳</div>
                        <div className="empty-state-text">Loading products...</div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <div className="empty-state-text">
                            {searchQuery ? 'No products match your search' : 'No products found'}
                        </div>
                    </div>
                ) : containerRef ? (
                    <Grid
                        columnCount={COLUMN_COUNT}
                        columnWidth={columnWidth}
                        height={containerHeight}
                        rowCount={rowCount}
                        rowHeight={CARD_HEIGHT}
                        width={containerWidth}
                        overscanRowCount={4}
                    >
                        {Cell}
                    </Grid>
                ) : null}
            </div>

            <div style={{ padding: '8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                {filteredProducts.length} products
            </div>
        </>
    );
}
