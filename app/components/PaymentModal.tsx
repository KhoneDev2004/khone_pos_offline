'use client';

import React, { useState } from 'react';
import { CartItem } from '@/app/hooks/useCart';
import { Banknote, Smartphone, Shuffle, X, DollarSign } from 'lucide-react';
import { useCurrency } from '@/app/hooks/useCurrency';

interface PaymentModalProps {
    items: CartItem[];
    total: number;
    onConfirm: (amountPaid: number, paymentMethod: string, shouldPrint: boolean, cashAmount?: number, transferAmount?: number) => void;
    onClose: () => void;
}

type PaymentMethod = 'cash' | 'transfer' | 'mixed';
type InputCurrency = 'LAK' | 'THB' | 'CNY' | 'USD';

export default function PaymentModal({ items, total, onConfirm, onClose }: PaymentModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [inputCurrency, setInputCurrency] = useState<InputCurrency>('LAK');
    const [amountPaidStr, setAmountPaidStr] = useState<string>('0');
    const [cashAmountStr, setCashAmountStr] = useState<string>('');
    const [transferAmountStr, setTransferAmountStr] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    
    const { rates, enabled, toCNY, toTHB, toUSD } = useCurrency();

    // Helpers
    const parseNumber = (val: string) => Number(val.replace(/,/g, '')) || 0;
    const formatNumber = (val: number | string) => {
        if (!val && val !== 0) return '';
        const num = typeof val === 'string' ? parseNumber(val) : val;
        return num.toLocaleString();
    };

    /** Convert an inputted foreign amount to LAK based on current rates */
    const toLak = (foreignAmt: number, currency: InputCurrency) => {
        if (currency === 'LAK') return foreignAmt;
        if (currency === 'THB') return foreignAmt * rates.lak_per_thb;
        if (currency === 'CNY') return foreignAmt * rates.lak_per_cny;
        if (currency === 'USD') return foreignAmt * rates.lak_per_usd;
        return foreignAmt;
    };

    const numAmount = parseNumber(amountPaidStr);
    const numCash = parseNumber(cashAmountStr);
    const numTransfer = parseNumber(transferAmountStr);

    const lakAmount = toLak(numAmount, inputCurrency);
    const lakCash = toLak(numCash, inputCurrency);
    const lakTransfer = toLak(numTransfer, inputCurrency);

    // Validation
    const isValidCash = paymentMethod === 'cash' && lakAmount >= total && numAmount > 0;
    const isValidTransfer = paymentMethod === 'transfer' && lakAmount >= total && numAmount > 0;
    const isValidMixed = paymentMethod === 'mixed' && (lakCash + lakTransfer) >= total && (numCash + numTransfer) > 0;
    const isValid = isValidCash || isValidTransfer || isValidMixed;

    const changeAmount = paymentMethod === 'mixed'
        ? (lakCash + lakTransfer) - total
        : lakAmount - total;

    const setFullAmount = () => {
        if (paymentMethod === 'mixed') {
            // For mixed, if THB/CNY, we just calculate the remaining in target currency
            const remainingLak = total - lakTransfer;
            const remainingForeign = inputCurrency === 'THB' ? toTHB(remainingLak)
                                   : inputCurrency === 'CNY' ? toCNY(remainingLak)
                                   : inputCurrency === 'USD' ? toUSD(remainingLak)
                                   : remainingLak;
            setCashAmountStr(formatNumber(Math.max(0, Math.ceil(remainingForeign))));
        } else {
            const targetForeign = inputCurrency === 'THB' ? Math.ceil(toTHB(total))
                                : inputCurrency === 'CNY' ? Math.ceil(toCNY(total))
                                : inputCurrency === 'USD' ? Math.ceil(toUSD(total))
                                : total;
            setAmountPaidStr(formatNumber(targetForeign));
        }
    };

    const handleConfirm = async (shouldPrint: boolean) => {
        if (!isValid || processing) return;
        setProcessing(true);
        // Note: The API currently expects LAK amounts for amount_paid, cash_amount, transfer_amount
        if (paymentMethod === 'mixed') {
            await onConfirm(lakCash + lakTransfer, 'mixed', shouldPrint, lakCash, lakTransfer);
        } else {
            await onConfirm(lakAmount, paymentMethod, shouldPrint);
        }
        setProcessing(false);
    };

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

    const fontStyle: React.CSSProperties = { fontFamily: "'Phetsarath OT', sans-serif" };

    const totalCNY = toCNY(total);
    const totalTHB = toTHB(total);
    const totalUSD = toUSD(total);

    const curSymbol = inputCurrency === 'LAK' ? '₭' : inputCurrency === 'THB' ? '฿' : inputCurrency === 'CNY' ? '¥' : '$';

    return (
        <div className="modal-overlay">
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: 480,
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    padding: '24px 28px',
                    ...fontStyle,
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 20,
                }}>
                    <h2 className="modal-title" style={{ marginBottom: 0, ...fontStyle }}>💳 ຊຳລະເງິນ</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
                            padding: '6px', cursor: 'pointer', color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Total & Currency Conversions */}
                <div style={{
                    padding: '16px 18px', borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(74,108,247,0.12), rgba(99,102,241,0.12))',
                    border: '1px solid rgba(74,108,247,0.2)',
                    marginBottom: 10,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, ...fontStyle }}>ຍອດທີ່ຕ້ອງຈ່າຍ</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', ...fontStyle }}>
                                {totalItems} ລາຍການ
                            </div>
                        </div>
                        <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-primary)', ...fontStyle }}>
                            {total.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 600 }}>ກີບ</span>
                        </span>
                    </div>
                </div>

                {/* Currency conversion pills */}
                <div className="pm-currency-row">
                    {enabled.enable_thb && (
                    <div className="pm-currency-pill pm-thb">
                        <span>🇹🇭</span>
                        <div className="pm-currency-pill-content">
                            <span className="pm-currency-pill-label">ບາດ (THB)</span>
                            <span className="pm-currency-pill-value">฿{totalTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    )}
                    {enabled.enable_cny && (
                    <div className="pm-currency-pill pm-cny">
                        <span>🇨🇳</span>
                        <div className="pm-currency-pill-content">
                            <span className="pm-currency-pill-label">ຢວນ (CNY)</span>
                            <span className="pm-currency-pill-value">¥{totalCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    )}
                    {enabled.enable_usd && (
                    <div className="pm-currency-pill pm-usd">
                        <span>🇺🇸</span>
                        <div className="pm-currency-pill-content">
                            <span className="pm-currency-pill-label">ໂດລ່າ (USD)</span>
                            <span className="pm-currency-pill-value">${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    )}
                </div>

                {/* Payment Method Tabs */}
                <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, ...fontStyle }}>
                        ເລືອກວິທີຈ່າຍ
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {([
                            { key: 'cash' as PaymentMethod, label: 'ເງິນສົດ', icon: <Banknote size={15} /> },
                            { key: 'transfer' as PaymentMethod, label: 'ເງິນໂອນ', icon: <Smartphone size={15} /> },
                            { key: 'mixed' as PaymentMethod, label: 'ປະສົມ', icon: <Shuffle size={15} /> },
                        ]).map((m) => (
                            <button
                                key={m.key}
                                onClick={() => {
                                    setPaymentMethod(m.key);
                                    if (m.key !== 'mixed') {
                                        setAmountPaidStr('0');
                                    } else {
                                        setCashAmountStr('');
                                        setTransferAmountStr('');
                                    }
                                }}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                                    padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                                    border: paymentMethod === m.key
                                        ? '2px solid var(--accent-success)'
                                        : '1px solid var(--border-color)',
                                    background: paymentMethod === m.key
                                        ? 'rgba(34,197,94,0.12)'
                                        : 'var(--bg-elevated)',
                                    color: paymentMethod === m.key ? '#22c55e' : 'var(--text-secondary)',
                                    fontWeight: 600, fontSize: 12,
                                    transition: 'all 0.15s ease',
                                    ...fontStyle,
                                }}
                            >
                                {m.icon}
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input Currency Selector */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: 'var(--text-secondary)', marginBottom: 8, ...fontStyle,
                    }}>
                        ສະກຸນເງິນທີ່ຮັບ
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${1 + (enabled.enable_thb ? 1 : 0) + (enabled.enable_cny ? 1 : 0) + (enabled.enable_usd ? 1 : 0)}, 1fr)`, gap: 6 }}>
                        {(['LAK', ...(enabled.enable_thb ? ['THB'] : []), ...(enabled.enable_cny ? ['CNY'] : []), ...(enabled.enable_usd ? ['USD'] : [])] as InputCurrency[]).map((c) => (
                            <button
                                key={c}
                                onClick={() => {
                                    setInputCurrency(c);
                                    if (paymentMethod !== 'mixed') setAmountPaidStr('0');
                                    else { setCashAmountStr(''); setTransferAmountStr(''); }
                                }}
                                style={{
                                    padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                                    background: inputCurrency === c ? 'var(--accent-primary)' : 'var(--bg-input)',
                                    color: inputCurrency === c ? '#fff' : 'var(--text-secondary)',
                                    border: inputCurrency === c ? '1px solid var(--accent-primary-hover)' : '1px solid var(--border-color)',
                                    fontSize: 13, fontWeight: 700, transition: 'all 0.1s', ...fontStyle
                                }}
                            >
                                {c === 'LAK' ? '₭ ກີບ' : c === 'THB' ? '฿ ບາດ' : c === 'CNY' ? '¥ ຢວນ' : '$ ໂດລ່າ'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cash or Transfer Input */}
                {paymentMethod !== 'mixed' && (
                    <>
                        <button
                            onClick={setFullAmount}
                            style={{
                                width: '100%', marginBottom: 12, fontSize: 14, padding: '10px',
                                fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                                transition: 'all 0.15s ease', ...fontStyle,
                            }}
                        >
                            💰 ຮັບເງິນເຕັມຈຳນວນ
                        </button>

                        <div style={{ marginBottom: 8 }}>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
                                    fontSize: 22, fontWeight: 700, color: 'var(--text-muted)'
                                }}>{curSymbol}</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={amountPaidStr}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setAmountPaidStr(val ? formatNumber(val) : '0');
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    autoFocus
                                    style={{
                                        width: '100%', fontSize: 26, fontWeight: 800,
                                        textAlign: 'right', padding: '14px 18px 14px 45px',
                                        background: 'var(--bg-input)',
                                        border: '2px solid var(--border-color)',
                                        borderRadius: 12, color: 'var(--text-primary)',
                                        outline: 'none', transition: 'border-color 0.15s',
                                        ...fontStyle,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Foreign currency quick-reference for entered amount */}
                        {inputCurrency !== 'LAK' && numAmount > 0 && (
                            <div className="pm-received-convert">
                                <span>ຮັບ: {lakAmount.toLocaleString()} ກີບ</span>
                            </div>
                        )}
                    </>
                )}

                {/* Mixed Payment */}
                {paymentMethod === 'mixed' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div>
                                <label style={{
                                    display: 'block', fontSize: 13, fontWeight: 600,
                                    color: 'var(--text-secondary)', marginBottom: 6, ...fontStyle,
                                }}>ເງິນສົດ {inputCurrency}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>{curSymbol}</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={cashAmountStr}
                                        onChange={(e) => setCashAmountStr(formatNumber(e.target.value.replace(/[^0-9]/g, '')))}
                                        autoFocus placeholder="0"
                                        style={{
                                            width: '100%', fontSize: 20, fontWeight: 700, textAlign: 'right', padding: '12px 14px 12px 30px',
                                            background: 'var(--bg-input)', border: '2px solid var(--border-color)',
                                            borderRadius: 10, color: 'var(--text-primary)', outline: 'none', ...fontStyle,
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{
                                    display: 'block', fontSize: 13, fontWeight: 600,
                                    color: 'var(--text-secondary)', marginBottom: 6, ...fontStyle,
                                }}>ເງິນໂອນ {inputCurrency}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>{curSymbol}</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={transferAmountStr}
                                        onChange={(e) => setTransferAmountStr(formatNumber(e.target.value.replace(/[^0-9]/g, '')))}
                                        placeholder="0"
                                        style={{
                                            width: '100%', fontSize: 20, fontWeight: 700, textAlign: 'right', padding: '12px 14px 12px 30px',
                                            background: 'var(--bg-input)', border: '2px solid var(--border-color)',
                                            borderRadius: 10, color: 'var(--text-primary)', outline: 'none', ...fontStyle,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Mixed summary */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.03)', marginBottom: 14,
                            fontSize: 13, fontWeight: 600, ...fontStyle,
                        }}>
                            <span>ລວມ LAK: {(lakCash + lakTransfer).toLocaleString()} / {total.toLocaleString()} ກີບ</span>
                            <span style={{ color: (lakCash + lakTransfer) >= total ? '#22c55e' : '#ef4444' }}>
                                {(lakCash + lakTransfer) >= total ? '✅ ຄົບ' : `❌ ຂາດ`}
                            </span>
                        </div>
                    </>
                )}

                {/* Change Amount */}
                {changeAmount >= 0 && (paymentMethod !== 'mixed' ? lakAmount > 0 : (lakCash + lakTransfer) > 0) && (
                    <div style={{
                        padding: '14px 18px', borderRadius: 12, marginBottom: 14,
                        background: changeAmount > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)',
                        border: '1px solid rgba(34,197,94,0.2)',
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 15, ...fontStyle }}>💰 ເງິນທອນ {(inputCurrency === 'LAK' && changeAmount > 0) ? '(ກີບ)' : ''}</span>
                            <span style={{ color: '#22c55e', fontSize: 26, fontWeight: 800, ...fontStyle }}>
                                {changeAmount.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 600 }}>ກີບ</span>
                            </span>
                        </div>
                        {changeAmount > 0 && inputCurrency !== 'LAK' && (
                            <div className="pm-change-convert">
                                ທອນເປັນ {inputCurrency}:  
                                {inputCurrency === 'THB' ? ` ฿${toTHB(changeAmount).toFixed(1)}` : ''}
                                {inputCurrency === 'CNY' ? ` ¥${toCNY(changeAmount).toFixed(1)}` : ''}
                                {inputCurrency === 'USD' ? ` $${toUSD(changeAmount).toFixed(2)}` : ''}
                            </div>
                        )}
                        {changeAmount > 0 && inputCurrency === 'LAK' && (
                            <div className="pm-change-convert">
                                {enabled.enable_thb && <><span>≈ ฿{toTHB(changeAmount).toFixed(1)}</span><span className="pm-dot">·</span></>}
                                {enabled.enable_cny && <><span>≈ ¥{toCNY(changeAmount).toFixed(1)}</span><span className="pm-dot">·</span></>}
                                {enabled.enable_usd && <span>≈ ${toUSD(changeAmount).toFixed(2)}</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8, marginTop: 20
                }}>
                    <button
                        onClick={onClose}
                        disabled={processing}
                        style={{
                            padding: '14px 12px', fontSize: 14, fontWeight: 600,
                            borderRadius: 12, border: '1px solid var(--border-color)',
                            background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                            cursor: 'pointer', ...fontStyle,
                        }}
                    >
                        ຍົກເລີກ
                    </button>
                    <button
                        onClick={() => handleConfirm(false)}
                        disabled={!isValid || processing}
                        style={{
                            padding: '14px 12px', fontSize: 14, fontWeight: 700,
                            borderRadius: 12, border: 'none', cursor: isValid ? 'pointer' : 'not-allowed',
                            background: isValid
                                ? 'linear-gradient(135deg, #4A6CF7, #5a4bd1)'
                                : 'rgba(74,108,247,0.3)',
                            color: 'white', opacity: isValid ? 1 : 0.5,
                            transition: 'all 0.15s ease',
                            ...fontStyle,
                        }}
                    >
                        {processing ? '⏳ ກຳລັງ...' : '✅ ຢືນຢັນ'}
                    </button>
                    <button
                        onClick={() => handleConfirm(true)}
                        disabled={!isValid || processing}
                        style={{
                            padding: '14px 12px', fontSize: 14, fontWeight: 700,
                            borderRadius: 12, border: 'none', cursor: isValid ? 'pointer' : 'not-allowed',
                            background: isValid
                                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                : 'rgba(34,197,94,0.3)',
                            color: 'white', opacity: isValid ? 1 : 0.5,
                            transition: 'all 0.15s ease',
                            ...fontStyle,
                        }}
                    >
                        {processing ? '⏳ ກຳລັງ...' : '🖨️ ຢືນຢັນ & ປິ້ນ'}
                    </button>
                </div>
            </div>
        </div>
    );
}
