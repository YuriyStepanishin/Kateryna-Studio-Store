'use client';
import { useAuthStore } from '@/store/auth';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import Container from './Container';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import styles from './Layout.module.css';
export default function Header() {
 const user=useAuthStore(state=>state.user); const [open, setOpen] = useState(false); const { itemsCount } = useCart(); return <header className={styles.header}><Container><div className={styles.inner}><Link className={styles.logo} href="/"><BrandLogo/></Link><nav id="navigation" className={open ? styles.navOpen : styles.nav} onClick={() => setOpen(false)}><Link href="/#catalog">Каталог</Link><Link href="/#media">Відео та фото</Link><Link href="/#about">Про магазин</Link><Link href="/#checkout">Замовлення</Link></nav><div className={styles.actions}><ThemeToggle /><button className={styles.menu} aria-label="Меню" aria-controls="navigation" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>{user?.role==='ADMIN'&&<Link href="/admin">Адмін</Link>}<Link href={user?'/profile':'/login'}>{user?'Кабінет':'Вхід'}</Link><Link href="/#cart">Кошик ({itemsCount})</Link></div></div></Container></header>; }
