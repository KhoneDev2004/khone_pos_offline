'use client';

import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    enabled?: boolean;
}

export default function BarcodeScanner({ onScan, enabled = true }: BarcodeScannerProps) {
    const bufferRef = useRef('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastKeyTimeRef = useRef(0);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!enabled) return;

            const target = e.target as HTMLElement;
            const isSearchInput =
                target.tagName === 'INPUT' &&
                ((target as HTMLInputElement).classList.contains('search-input') ||
                    (target as HTMLInputElement).classList.contains('pos-search-input'));

            // Ignore if focused on textarea or non-search inputs
            if (
                target.tagName === 'TEXTAREA' ||
                (target.tagName === 'INPUT' && !isSearchInput)
            ) {
                return;
            }

            const now = Date.now();
            const timeSinceLastKey = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            // Barcode scanners send Enter at the end
            if (e.key === 'Enter') {
                if (bufferRef.current.length >= 3) {
                    e.preventDefault();
                    e.stopPropagation();
                    const barcode = bufferRef.current.trim();

                    // Clear the search input if it contains barcode text
                    if (isSearchInput) {
                        const input = target as HTMLInputElement;
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                            window.HTMLInputElement.prototype, 'value'
                        )?.set;
                        if (nativeInputValueSetter) {
                            nativeInputValueSetter.call(input, '');
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }

                    onScan(barcode);
                }
                bufferRef.current = '';
                if (timerRef.current) clearTimeout(timerRef.current);
                return;
            }

            // Only accept printable characters
            if (e.key.length === 1) {
                // If time between keys > 300ms, it's manual typing — reset buffer
                if (timeSinceLastKey > 300) {
                    bufferRef.current = '';
                }
                bufferRef.current += e.key;

                // Reset buffer after 300ms of no input (scanners are fast but some need more time)
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    bufferRef.current = '';
                }, 300);
            }
        },
        [enabled, onScan]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [handleKeyDown]);

    // This component doesn't render anything visual
    return null;
}
