'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useAuthStore} from '@/store/auth';
import {logout} from '@/services/auth';
import styles from '@/components/Auth.module.css';
export default function Profile(){const {user,loaded,error,setSession}=useAuthStore();const client=useQueryClient();const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function signOut(){setBusy(true);try{await logout();setSession(null);client.clear();}catch{setMessage('Не вдалося завершити сесію. Спробуйте ще раз.');}finally{setBusy(false);}}
 if(!loaded)return <main className={styles.page}><p role="status">Перевіряємо сесію…</p></main>;
 if(!user)return <main className={styles.page}><h1>Особистий кабінет</h1>{error&&<p role="alert">{error}</p>}<Link className={styles.link} href="/login">Увійти до акаунта</Link></main>;
 return <main className={styles.page}><h1>Вітаємо, {user.name}</h1>{user.role==='ADMIN'&&<p><Link className={styles.link} href="/admin">Керування магазином →</Link></p>}<div className={styles.details}><p>{user.email}</p>{user.phone&&<p>{user.phone}</p>}<p>Ваш акаунт створено. Історія замовлень та обране з’являться на наступних етапах.</p></div><div className={styles.form}><button disabled={busy} onClick={signOut}>{busy?'Вихід…':'Вийти з акаунта'}</button></div>{message&&<p role="alert">{message}</p>}</main>;}
