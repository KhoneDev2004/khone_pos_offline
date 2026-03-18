'use client';
import { useState, useEffect, useCallback } from 'react';

export interface ExchangeRates {
    /** How many LAK per 1 CNY (Yuan) */
    lak_per_cny: number;
    /** How many LAK per 1 THB (Baht) */
    lak_per_thb: number;
    /** How many LAK per 1 USD (Dollar) */
    lak_per_usd: number;
}

export interface CurrencyEnabled {
    enable_thb: boolean;
    enable_cny: boolean;
    enable_usd: boolean;
}

const DEFAULTS: ExchangeRates = {
    lak_per_cny: 3100,
    lak_per_thb: 683,
    lak_per_usd: 21450,
};

const ENABLED_DEFAULTS: CurrencyEnabled = {
    enable_thb: true,
    enable_cny: true,
    enable_usd: true,
};

export function useCurrency() {
    const [rates, setRates] = useState<ExchangeRates>(DEFAULTS);
    const [enabled, setEnabled] = useState<CurrencyEnabled>(ENABLED_DEFAULTS);

    // Fetch from global settings API on mount
    useEffect(() => {
        let mounted = true;
        fetch('/api/settings')
            .then((res) => res.json())
            .then((json) => {
                if (mounted && json.status === 'success' && json.data) {
                    setRates({
                        lak_per_cny: Number(json.data.lak_per_cny) || DEFAULTS.lak_per_cny,
                        lak_per_thb: Number(json.data.lak_per_thb) || DEFAULTS.lak_per_thb,
                        lak_per_usd: Number(json.data.lak_per_usd) || DEFAULTS.lak_per_usd,
                    });
                    setEnabled({
                        enable_thb: json.data.enable_thb !== 'false',
                        enable_cny: json.data.enable_cny !== 'false',
                        enable_usd: json.data.enable_usd !== 'false',
                    });
                }
            })
            .catch(() => { /* ignore, use defaults */ });
        return () => { mounted = false; };
    }, []);

    /** Convert LAK amount to CNY */
    const toCNY = useCallback(
        (lak: number) => (rates.lak_per_cny > 0 ? lak / rates.lak_per_cny : 0),
        [rates.lak_per_cny]
    );

    /** Convert LAK amount to THB */
    const toTHB = useCallback(
        (lak: number) => (rates.lak_per_thb > 0 ? lak / rates.lak_per_thb : 0),
        [rates.lak_per_thb]
    );

    /** Convert LAK amount to USD */
    const toUSD = useCallback(
        (lak: number) => (rates.lak_per_usd > 0 ? lak / rates.lak_per_usd : 0),
        [rates.lak_per_usd]
    );

    return { rates, enabled, toCNY, toTHB, toUSD };
}
