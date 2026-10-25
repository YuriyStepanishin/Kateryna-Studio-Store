'use client';
import type { ReactNode } from 'react';
import { useCartStore } from '@/store/cart';

export default function OpenCartButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const openCart = useCartStore(state => state.openCart);
  return (
    <button type="button" className={className} onClick={openCart}>
      {children}
    </button>
  );
}
