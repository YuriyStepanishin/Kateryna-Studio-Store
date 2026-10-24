'use client';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {fetchCatalog} from '@/services/storeApi';
import {BRAND} from '@/constants/brand';
import {STORE_SOCIALS} from '@/constants/socials';
import Container from './Container';
import BrandLogo from './BrandLogo';
import styles from './Footer.module.css';
function SocialIcon({name}:{name:typeof STORE_SOCIALS[number]['id']}){
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
  {name==='instagram'?<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none"/></>:name==='telegram'?<><path d="m21 4-3.5 16-5.3-4.3-3.4 3 .7-5.3L21 4 3 11l6.5 2.4"/></>:<><path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.5v3a1.5 1.5 0 1 0 1 1.5V3h3c.5 3 2 4.5 5 5v3c-2-.3-3.5-1.2-5-2.5"/></>}
 </svg>;
}
export default function Footer(){
 const {data}=useQuery({queryKey:['catalog'],queryFn:fetchCatalog});
 const info=data?.info;
 return <footer className={styles.footer} id="contacts"><Container>
  <div className={styles.top}><p className={styles.eyebrow}>Догляд, що починається з любові до себе</p><a href="https://t.me/Musiychuk_GPT_hair" target="_blank" rel="noopener noreferrer" className={styles.consult}>Написати нам <span aria-hidden="true">↗</span></a></div>
  <div className={styles.columns}>
   <div className={styles.brand}><Link href="/" className={styles.logo}><BrandLogo/></Link><p>Професійна косметика для догляду, відновлення та захисту волосся.</p><span className={styles.brandCaption}>Ваш простір турботи про волосся</span></div>
   <nav aria-labelledby="footer-catalog"><h2 id="footer-catalog">Каталог</h2><ul><li><Link href="/#catalog">Шампуні</Link></li><li><Link href="/#catalog">Кондиціонери</Link></li><li><Link href="/#catalog">Маски</Link></li><li><Link href="/#catalog">Олії</Link></li><li><Link className={styles.allProducts} href="/#catalog">Усі товари <span aria-hidden="true">→</span></Link></li></ul></nav>
   <nav aria-labelledby="footer-info"><h2 id="footer-info">Інформація</h2><ul><li><Link href="/#about">Про нас</Link></li><li><Link href="/delivery">Доставка</Link></li><li><Link href="/payment">Оплата</Link></li><li><Link href="/blog">Статті про догляд</Link></li><li><a href="#contacts">Контакти</a></li><li><Link href="/profile">Особистий кабінет</Link></li></ul></nav>
   <div className={styles.contacts}><h2>Залишаймося на зв’язку</h2><address>{info?.phone&&<a className={styles.phone} href={'tel:'+info.phone.replace(/[^+\d]/g,'')}>{info.phone}</a>}{info?.email&&<a href={'mailto:'+info.email}>{info.email}</a>}<span>{info?.address||'Україна'}</span></address><p className={styles.socialIntro}>Новинки та поради з догляду — у наших соцмережах</p><ul className={styles.socials} aria-label="Соціальні мережі">{STORE_SOCIALS.map(social=><li key={social.id}><a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND.name} у ${social.name}: ${social.handle}`} title={social.handle}><SocialIcon name={social.id}/><span>{social.name}</span><span className={styles.external} aria-hidden="true">↗</span></a></li>)}</ul></div>
  </div>
  <div className={styles.bottom}><p>© {new Date().getFullYear()} {BRAND.name}. Усі права захищені.</p><a href="#top" onClick={event=>{event.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}>На початок сторінки <span aria-hidden="true">↑</span></a></div>
 </Container></footer>;
}
