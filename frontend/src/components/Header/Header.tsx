'use client';
import { useAuthStore } from '@/store/auth';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import CartIcon from '@/components/CartIcon/CartIcon';
import Container from '../Container/Container';
import BrandLogo from '../BrandLogo/BrandLogo';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import css from '../shared/Layout.module.css';

export default function Header() {
  const user = useAuthStore(state => state.user);
  const [open, setOpen] = useState(false);
  const { itemsCount, openCart } = useCart();
  return (
    <header className={css.header}>
      <Container>
        <div className={css.inner}>
          <Link className={css.logo} href="/">
            <BrandLogo />
          </Link>
          <nav
            id="navigation"
            className={open ? css.navOpen : css.nav}
            onClick={() => setOpen(false)}
          >
            <Link href="/#catalog">Каталог</Link>
            <Link href="/#media">Журнал про корисне</Link>
            <Link href="/#about">Про магазин</Link>
          </nav>
          <div className={css.actions}>
            <ThemeToggle />
            <button
              className={css.menu}
              aria-label="Меню"
              aria-controls="navigation"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              ☰
            </button>
            {user?.role === 'ADMIN' && <Link href="/admin">Адмін</Link>}
            <Link href={user ? '/profile' : '/login'}>
              {user ? 'Кабінет' : 'Вхід'}
            </Link>
            <button type="button" className={css.cartButton} onClick={openCart}>
              <CartIcon className={css.cartIcon} /> Кошик ({itemsCount})
            </button>
          </div>
        </div>
      </Container>
    </header>
  );
}
