import type {Metadata} from 'next';
import Link from 'next/link';
import styles from '@/components/InfoPage.module.css';
export const metadata:Metadata={title:'Оплата'};
export default function Payment(){return <main className={styles.page}><h1>Оплата замовлень</h1><p>Після оформлення замовлення очікуйте підтвердження. Наявність товарів, остаточну суму та спосіб оплати узгодимо з вами перед оплатою.</p><p>Онлайн-оплата на сайті поки не підключена. Натискання кнопки оформлення замовлення не списує кошти з вашого рахунку.</p><Link href="/#checkout">Оформити замовлення</Link><Link href="/#contacts">Уточнити деталі</Link></main>;}
