import type {Metadata} from 'next';
import Link from 'next/link';
import {DELIVERY_CARRIERS} from '@/constants/delivery';
import styles from '@/components/InfoPage.module.css';
export const metadata:Metadata={title:'Доставка'};
export default function Delivery(){return <main className={styles.page}>
 <h1>Доставка замовлень</h1><p>Оберіть перевізника й зручний спосіб отримання під час оформлення замовлення.</p>
 <div className={styles.carriers}>{DELIVERY_CARRIERS.map(carrier=><section className={styles.carrier} key={carrier.id}><span className={styles.carrierBadge} data-carrier={carrier.id} aria-hidden="true">{carrier.id==='nova_poshta'?'НП':carrier.id==='ukrposhta'?'УП':'ME'}</span><h2>{carrier.name}</h2><p>{carrier.id==='ukrposhta'?'Отримання у відділенні або кур’єром.':'Отримання у відділенні, поштоматі або кур’єром.'}</p><p>{carrier.id==='ukrposhta'?'Зазначте населений пункт, поштовий індекс і адресу відділення.':'Оберіть населений пункт і пункт отримання.'}</p></section>)}</div>
 <p>Знайдіть відділення чи поштомат у довіднику або введіть адресу вручну. Для кур’єра вкажіть вулицю, будинок та квартиру.</p>
 <p>Доступність обраного способу, вартість і термін доставки узгоджуються під час підтвердження замовлення. Перед відправленням уточнимо наявність товарів і деталі отримання.</p>
 <Link href="/#checkout">Оформити замовлення</Link><Link href="/#contacts">Зв’язатися з нами</Link>
 </main>;}
