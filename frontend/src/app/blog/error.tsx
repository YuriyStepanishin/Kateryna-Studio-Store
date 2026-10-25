'use client';
import Link from 'next/link';
import css from './Blog.module.css';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className={css.page}><h1>Не вдалося завантажити статті</h1><p>Спробуйте ще раз трохи пізніше.</p><button onClick={reset}>Спробувати ще раз</button><Link href="/">До магазину</Link></main>;}
