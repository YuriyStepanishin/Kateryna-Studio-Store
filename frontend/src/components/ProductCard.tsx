import type {Product} from '@/types/store';
import ProductPhoto from './ProductPhoto';
import styles from './ProductCard.module.css';
const money=(value:number)=>new Intl.NumberFormat('uk-UA',{style:'currency',currency:'UAH'}).format(value);
export const canAddProduct=(p:Product)=>p.isPublished!==false&&p.price>0&&(p.stock===undefined||p.stock>0);
export function ProductPrice({product:p}:{product:Product}){return <span className={styles.price}>{p.oldPrice!=null&&p.oldPrice>p.price&&<del>{money(p.oldPrice)}</del>}{p.price>0?money(p.price):'Ціна уточнюється'}</span>;}
export function CartButton({product,busy,added,onAdd}:{product:Product;busy:boolean;added:boolean;onAdd:()=>void}){
 const label=product.isPublished===false?'Ще не опубліковано':product.price<=0?'Ціна уточнюється':product.stock===0?'Немає в наявності':added?'Додано ✓':'До кошика';
 return <button type="button" className={styles.cart} disabled={busy||!canAddProduct(product)} aria-label={canAddProduct(product)?`Додати ${product.title} до кошика`:label} onClick={onAdd}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 3h2l3 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>{label}</button>;
}
export default function ProductCard({product:p,busy,added,onAdd,onOpen}:{product:Product;busy:boolean;added:boolean;onAdd:()=>void;onOpen:()=>void}){
 return <li className={styles.card} onClick={event=>{if(!(event.target as HTMLElement).closest('button,a,input,select'))onOpen();}}>
  <button type="button" className={styles.photoButton} onClick={onOpen} aria-label={`Переглянути ${p.title}`}><ProductPhoto className={styles.photo} image={p.image} images={p.images} alt={p.title}/><span className={styles.openHint}>Детальніше ↗</span></button>
  <p className={styles.brand}>{[p.brand,p.category].filter(Boolean).join(' · ')}</p>
  {p.isPublished===false&&<span className={styles.badge}>Чернетка</span>}
  <h3><button type="button" className={styles.title} onClick={onOpen}>{p.title}</button></h3>
  <p className={styles.description}>{p.description}</p>
  <div className={styles.bottom}><ProductPrice product={p}/><CartButton product={p} busy={busy} added={added} onAdd={onAdd}/></div>
 </li>;
}
