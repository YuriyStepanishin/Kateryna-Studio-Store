'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {http} from '@/services/http';
import type {ArticleSummary} from '@/types/articles';
import styles from '../Admin.module.css';
export default function Articles(){
 const client=useQueryClient();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const {data,error,isPending}=useQuery({queryKey:['articles'],queryFn:async()=>(await http.get<ArticleSummary[]>('/articles')).data});
 async function publish(){setBusy(true);setMessage('');try{
  const {data:result}=await http.post<{inserted:number;reused:number;published:number;slugs:string[]}>('/admin/articles/publish-hair-care');
  const {data:visible}=await http.get<ArticleSummary[]>('/articles');
  if(!result.slugs.every(slug=>visible.some(a=>a.slug===slug)))throw new Error('Запис виконано, але видимість усіх статей ще не підтверджена.');
  await Promise.all([client.invalidateQueries({queryKey:['articles']}),client.invalidateQueries({queryKey:['catalog']})]);
  setMessage(`Опубліковано та перевірено: ${result.published}. Нових: ${result.inserted}; уже існували: ${result.reused}.`);
 }catch(error){setMessage(error instanceof Error?error.message:'Не вдалося опублікувати статті.');}finally{setBusy(false);}}
 return <section className={styles.panel}><h2>Статті про догляд</h2><p>Сім оригінальних україномовних матеріалів із повними текстами, SEO та джерелами. Повторна публікація не створює дублікати й не перезаписує змінені тексти.</p><button className={styles.button+' '+styles.primary} disabled={busy} onClick={()=>void publish()}>{busy?'Публікуємо…':'Опублікувати 7 статей'}</button>{message&&<p className={styles.status} role="status">{message}</p>}{isPending&&<p>Завантаження…</p>}{error&&<p role="alert">{error.message}</p>}<ul className={styles.list}>{data?.map(a=><li className={styles.row} key={a.id}><strong>{a.title}</strong><p>{a.category} · {a.date} · Опубліковано</p><Link href={'/blog/'+a.slug}>Перевірити на сайті →</Link></li>)}</ul><Link href="/blog">Відкрити журнал</Link></section>;
}
