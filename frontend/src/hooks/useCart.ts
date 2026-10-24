'use client';
import { useCartStore } from '@/store/cart';
export function useCart() { const state = useCartStore(); return { ...state, itemsCount: state.items.reduce((sum, item) => sum + item.qty, 0) }; }
