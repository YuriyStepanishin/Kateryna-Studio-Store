import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem } from '../types/store';

interface CartContextValue {
  items: CartItem[];
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  changeQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  itemsCount: number;
}

const STORAGE_KEY = 'kss_cart';
const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setItems(JSON.parse(raw) as CartItem[]);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (productId: string) => {
    setItems(prev => {
      const current = prev.find(item => item.productId === productId);
      if (current) {
        return prev.map(item =>
          item.productId === productId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { productId, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  };

  const changeQty = (productId: string, qty: number) => {
    const safeQty = Math.max(1, qty);
    setItems(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, qty: safeQty } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const itemsCount = useMemo(
    () => items.reduce((total, item) => total + item.qty, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addToCart,
      removeFromCart,
      changeQty,
      clearCart,
      itemsCount,
    }),
    [items, itemsCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return ctx;
};
