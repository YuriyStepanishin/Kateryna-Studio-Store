'use client';
import {useEffect} from 'react';
import {restoreSession} from '@/services/auth';
import {useAuthStore} from '@/store/auth';
export default function SessionBootstrap(){const setSession=useAuthStore(s=>s.setSession);useEffect(()=>{let active=true;restoreSession().then(user=>{if(active)setSession(user);}).catch(()=>{if(active)setSession(null,'Не вдалося перевірити сесію. Перевірте підключення до сервера.');});return ()=>{active=false;};},[setSession]);return null;}
