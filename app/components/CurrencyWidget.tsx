'use client';

import React from 'react';
import { useCurrency } from '@/app/hooks/useCurrency';

interface Props {
    /** LAK amount to convert (e.g. cart total). Pass 0 or omit to hide conversions. */
    totalLAK?: number;
}

export default function CurrencyWidget({ totalLAK = 0 }: Props) {
    const { rates, enabled, toCNY, toTHB, toUSD } = useCurrency();

    const cnyAmount = toCNY(totalLAK);
    const thbAmount = toTHB(totalLAK);
    const usdAmount = toUSD(totalLAK);

    const fontStyle: React.CSSProperties = { fontFamily: "'Phetsarath OT', sans-serif" };

    const hasAnyEnabled = enabled.enable_thb || enabled.enable_cny || enabled.enable_usd;

    if (!hasAnyEnabled) return null;

    return (
        <div className="currency-widget" style={fontStyle}>
            {/* Rate bar */}
            <div className="currency-rate-bar">
                {/* Currency conversions */}
                {totalLAK > 0 && (
                    <>
                        {enabled.enable_cny && (
                        <div className="currency-rate-pill currency-cny" title={`¥1 = ${rates.lak_per_cny.toLocaleString()} ກີບ`}>
                            <span className="currency-flag">🇨🇳</span>
                            <span className="currency-amount">¥{cnyAmount.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        </div>
                        )}
                        {enabled.enable_thb && (
                        <div className="currency-rate-pill currency-thb" title={`฿1 = ${rates.lak_per_thb.toLocaleString()} ກີບ`}>
                            <span className="currency-flag">🇹🇭</span>
                            <span className="currency-amount">฿{thbAmount.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        </div>
                        )}
                        {enabled.enable_usd && (
                        <div className="currency-rate-pill currency-usd" title={`$1 = ${rates.lak_per_usd.toLocaleString()} ກີບ`}>
                            <span className="currency-flag">🇺🇸</span>
                            <span className="currency-amount">${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        </div>
                        )}
                    </>
                )}
                {totalLAK === 0 && (
                    <div className="currency-rate-info">
                        {enabled.enable_cny && <span>¥1 = {rates.lak_per_cny.toLocaleString()} ກີບ</span>}
                        {enabled.enable_cny && (enabled.enable_thb || enabled.enable_usd) && <span className="currency-sep">·</span>}
                        {enabled.enable_thb && <span>฿1 = {rates.lak_per_thb.toLocaleString()} ກີບ</span>}
                        {enabled.enable_thb && enabled.enable_usd && <span className="currency-sep">·</span>}
                        {enabled.enable_usd && <span>$1 = {rates.lak_per_usd.toLocaleString()} ກີບ</span>}
                    </div>
                )}
            </div>
        </div>
    );
}
