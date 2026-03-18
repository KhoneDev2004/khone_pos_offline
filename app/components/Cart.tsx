'use client';

import React from 'react';
import { Trash2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { CartItem } from '@/app/hooks/useCart';

interface CartProps {
    items: CartItem[];
    total: number;
    itemCount: number;
    onUpdateQuantity: (productId: number, quantity: number) => void;
    onRemoveItem: (productId: number) => void;
    onClearCart: () => void;
    onCheckout: () => void;
}

export default function Cart({
    items,
    total,
    itemCount,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    onCheckout,
}: CartProps) {
    return (
        <>
            <div className="cart-header">
                <div className="flex items-center justify-between">
                    <h2>
                        <ShoppingCart size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                        Cart
                    </h2>
                    {items.length > 0 && (
                        <button className="btn btn-danger btn-sm" onClick={onClearCart}>
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="cart-items">
                {items.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                        <div className="empty-state-icon">🛒</div>
                        <div className="empty-state-text">Cart is empty</div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 8 }}>
                            Click products or scan barcodes to add items
                        </p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="cart-item">
                            <div className="cart-item-info">
                                <div className="cart-item-name">{item.name}</div>
                                <div className="cart-item-price">₭{item.price.toLocaleString()}</div>
                            </div>
                            <div className="cart-item-controls">
                                <button
                                    className="qty-btn"
                                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="cart-item-qty">{item.quantity}</span>
                                <button
                                    className="qty-btn"
                                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                    disabled={item.quantity >= item.stock}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            <div className="cart-item-subtotal">
                                ₭{(item.price * item.quantity).toLocaleString()}
                            </div>
                            <button
                                className="cart-item-remove"
                                onClick={() => onRemoveItem(item.id)}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="cart-footer">
                <div className="cart-item-count">{itemCount} items in cart</div>
                <div className="cart-total-row">
                    <span className="cart-total-label">Total</span>
                    <span className="cart-total-value">₭{total.toLocaleString()}</span>
                </div>
                <button
                    className="btn btn-primary"
                    disabled={items.length === 0}
                    onClick={onCheckout}
                >
                    💳 Pay Now
                </button>
            </div>
        </>
    );
}
