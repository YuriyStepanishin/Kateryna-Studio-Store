'use client';
import {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {http} from '@/services/http';
import type {MediaItem} from '@/types/store';
import css from '@/app/admin/Admin.module.css';
export default function ImportHairMedia(){
 const client=useQueryClient();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function run(){if(busy)return;setBusy(true);setMessage('Перевіряємо 4 відео та завантажуємо 10 фото у Cloudinary. Це може зайняти кілька хвилин.');
 try{const {data}=await http.post<{inserted:number;reused:number;verified:number;keys:string[]}>('/admin/content/media/import-hair-care',undefined,{timeout:180000});
 const {data:catalog}=await http.get<{media:MediaItem[]}>('/catalog');if(!data.keys.every(key=>catalog.media.some(m=>m.source?.key===key)))throw new Error('Записи збережено, але видимість усієї добірки ще не підтверджена.');
 await Promise.all([client.invalidateQueries({queryKey:['admin','content']}),client.invalidateQueries({queryKey:['catalog']})]);setMessage(`Перевірено на сайті: ${data.verified} матеріалів. Додано: ${data.inserted}; уже існували: ${data.reused}.`);
 }catch(error){setMessage(error instanceof Error?error.message:'Імпорт не завершено.');}finally{setBusy(false);}}
 return <div className={css.panel}><h2>Добірка про догляд за волоссям</h2><p>4 навчальні відео (2 українською, 2 англійською) та 10 фото Pexels. Фото зберігаються у Cloudinary, автори й джерела — разом із записами. Повторний запуск не створює дублікатів.</p><button type="button" className={css.button+' '+css.primary} disabled={busy} onClick={()=>void run()}>{busy?'Імпорт триває…':'Додати 4 відео та 10 фото'}</button>{message&&<p className={css.status} role="status">{message}</p>}</div>;
}
