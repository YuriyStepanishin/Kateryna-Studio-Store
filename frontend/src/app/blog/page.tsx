import type {Metadata} from 'next';
import Link from 'next/link';
import {getArticles} from '@/services/articles.server';
import styles from './Blog.module.css';
export const metadata:Metadata={title:'Статті про догляд за волоссям',description:'Практичні україномовні статті omee store про домашній догляд, маски, термозахист, фарбоване та кучеряве волосся.'};
export default async function Blog(){
 const articles=await getArticles();
 return <main className={styles.page}><p className={styles.eyebrow}>Журнал omee store</p><h1>Догляд, який зрозуміло</h1><p className={styles.intro}>Практичні поради, щоб зібрати власну рутину й краще розуміти потреби волосся.</p>
 {!articles.length&&<p>Статті готуються до публікації.</p>}
 <div className={styles.grid}>{articles.map(a=><article className={styles.card} key={a.id}><p className={styles.eyebrow}>{a.category}</p><h2><Link href={'/blog/'+a.slug}>{a.title}</Link></h2><p>{a.excerpt}</p><time dateTime={a.date}>{new Date(a.date+'T00:00:00Z').toLocaleDateString('uk-UA',{timeZone:'UTC'})}</time><Link href={'/blog/'+a.slug} className={styles.read}>Читати статтю →</Link></article>)}</div>
 <Link href="/#catalog" className={styles.read}>Перейти до каталогу →</Link></main>;
}
