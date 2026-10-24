'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem } from '@/types/store';
interface CartState {
    items: CartItem[];
    addToCart: (id: string) => void;
    removeFromCart: (id: string) => void;
    changeQty: (id: string, qty: number) => void;
    clearCart: () => void;
}
const safeQty = (qty: number) => Number.isFinite(qty) ? Math.min(99, Math.max(1, Math.floor(qty))) : 1;
export const useCartStore = create<CartState>()(persist((set) => ({
    items: [],
    addToCart: (productId) => set(state => ({ items: state.items.some(i => i.productId === productId) ? state.items.map(i => i.productId === productId ? { ...i, qty: safeQty(i.qty + 1) } : i) : [...state.items, { productId, qty: 1 }] })),
    removeFromCart: (id) => set(state => ({ items: state.items.filter(i => i.productId !== id) })),
    changeQty: (id, qty) => set(state => ({ items: state.items.map(i => i.productId === id ? { ...i, qty: safeQty(qty) } : i) })),
    clearCart: () => set({ items: [] })
}), { name: 'kss_cart_v2', storage: createJSONStorage(() => localStorage), skipHydration: true, partialize: state => ({ items: state.items }), merge: (persisted, current) => { const raw = (persisted as {
        items?: unknown;
    })?.items; const unique = new Map<string, CartItem>(); if (Array.isArray(raw))
        for (const item of raw) {
            if (item && typeof item.productId === 'string' && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 99)
                unique.set(item.productId, item);
        } return { ...current, items: [...unique.values()] }; } }));
