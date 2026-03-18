'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface Product {
    id: number;
    name: string;
    barcode: string;
    price: number;
    stock: number;
    category: string;
    image_path: string;
    created_at: string;
}

interface ProductsResponse {
    products: Product[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const cacheRef = useRef<Map<string, { data: ProductsResponse; time: number }>>(new Map());

    const fetchProducts = useCallback(async (search: string = '', page: number = 1, limit: number = 5000) => {
        const cacheKey = `${search}-${page}-${limit}`;
        const cached = cacheRef.current.get(cacheKey);

        // Use cache if fresh (30 seconds)
        if (cached && Date.now() - cached.time < 30000) {
            setProducts(cached.data.products);
            setTotal(cached.data.pagination.total);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                search,
                page: page.toString(),
                limit: limit.toString(),
            });

            const res = await fetch(`/api/products?${params}`);
            const json = await res.json();

            if (json.status === 'success') {
                const data = json.data as ProductsResponse;
                setProducts(data.products);
                setTotal(data.pagination.total);
                cacheRef.current.set(cacheKey, { data, time: Date.now() });
            } else {
                setError(json.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    }, []);

    const invalidateCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return {
        products,
        loading,
        error,
        total,
        fetchProducts,
        invalidateCache,
        refetch: () => {
            invalidateCache();
            fetchProducts();
        },
    };
}
