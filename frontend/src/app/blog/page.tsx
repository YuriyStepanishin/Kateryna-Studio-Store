import type {Metadata} from 'next';
import Link from 'next/link';
import {getArticles,getMedia} from '@/services/articles.server';
import MediaPreview from '@/components/MediaPreview/MediaPreview';
import css from './Blog.module.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Журнал',description:'Журнал omee store: статті, фото та відео про домашній догляд, маски, термозахист, фарбоване та кучеряве волосся.'};
export default async function Blog(){
 const [articles,media]=await Promise.all([getArticles(),getMedia().catch(()=>[])]);
 return <main className={css.page}><p className={css.eyebrow}>Журнал omee store</p><h1>Догляд, який зрозуміло</h1><p className={css.intro}>Статті, фото та відео з порадами, щоб зібрати власну рутину й краще розуміти потреби волосся.</p>
 {!articles.length&&!media.length&&<p>Матеріали готуються до публікації.</p>}
 <div className={css.grid}>
 {media.map(m=><article className={css.card} key={'media-'+m.id}><h2>{m.title}</h2><MediaPreview item={m} className={css.media}/></article>)}
 {articles.map(a=><article className={css.card} key={a.id}><p className={css.eyebrow}>{a.category}</p><h2><Link href={'/blog/'+a.slug}>{a.title}</Link></h2><p>{a.excerpt}</p><time dateTime={a.date}>{new Date(a.date+'T00:00:00Z').toLocaleDateString('uk-UA',{timeZone:'UTC'})}</time><Link href={'/blog/'+a.slug} className={css.read}>Читати статтю →</Link></article>)}
 </div>
 <Link href="/#catalog" className={css.read}>Перейти до каталогу →</Link></main>;
}
