'use client';
import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {http} from '@/services/http';
import {DELIVERY_CARRIERS,type DeliveryCarrier,type DeliveryType} from '@/constants/delivery';
import type {PaymentPayload} from '@/types/store';
import styles from './DeliveryFields.module.css';
type Option={id:string;label:string;regionRef?:string};
function useDebounced(value:string){
 const [debounced,setDebounced]=useState(value);
 useEffect(()=>{const timer=setTimeout(()=>setDebounced(value),350);return ()=>clearTimeout(timer);},[value]);
 return debounced;
}
export default function DeliveryFields({form,onChange,disabled}:{form:PaymentPayload;onChange:(value:PaymentPayload)=>void;disabled:boolean}){
 const carrier=form.deliveryCarrier||'nova_poshta';
 const type=form.deliveryType||'branch';
 const [selectedCity,setSelectedCity]=useState<Option|null>(null);
 const [manual,setManual]=useState(false);
 const [pointSearch,setPointSearch]=useState('');
 const cityQuery=useDebounced(form.city);
 const pointQuery=useDebounced(pointSearch);
 const status=useQuery({queryKey:['delivery-status'],queryFn:async()=>(await http.get<Record<DeliveryCarrier,{configured:boolean}>>('/delivery/status')).data,retry:false,staleTime:60000});
 const configured=status.data?.[carrier]?.configured===true;
 const cities=useQuery({queryKey:['delivery-cities',carrier,cityQuery],queryFn:async({signal})=>(await http.get<Option[]>('/delivery/cities',{signal,params:{carrier,q:cityQuery}})).data,enabled:configured&&!manual&&!selectedCity&&cityQuery.trim().length>=2,retry:false,staleTime:300000});
 const points=useQuery({queryKey:['delivery-points',carrier,type,selectedCity?.id,selectedCity?.regionRef,pointQuery],queryFn:async({signal})=>(await http.get<Option[]>('/delivery/points',{signal,params:{carrier,type,cityRef:selectedCity?.id,regionRef:selectedCity?.regionRef,q:pointQuery}})).data,enabled:configured&&!manual&&Boolean(selectedCity)&&type!=='courier',retry:false,staleTime:300000});
 const useManual=manual||!configured;
 function reset(next:PaymentPayload){setSelectedCity(null);setPointSearch('');setManual(false);onChange({...next,city:'',address:''});}
 const pointLabel=type==='locker'?'Поштомат':'Відділення';
 return <fieldset className={styles.fields} disabled={disabled}><legend>Доставка</legend>
  <div className={styles.row}>
   <label>Перевізник<select value={carrier} onChange={e=>{const next=e.target.value as DeliveryCarrier;reset({...form,deliveryCarrier:next,deliveryType:next==='ukrposhta'&&type==='locker'?'branch':type});}}>{DELIVERY_CARRIERS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label>Отримання<select value={type} onChange={e=>{setPointSearch('');onChange({...form,deliveryType:e.target.value as DeliveryType,address:''});}}><option value="branch">У відділенні</option>{carrier!=='ukrposhta'&&<option value="locker">У поштоматі</option>}<option value="courier">Кур’єром</option></select></label>
  </div>
  <label>Населений пункт<input value={form.city} required maxLength={120} autoComplete="address-level2" placeholder="Введіть щонайменше 2 літери" onChange={e=>{setSelectedCity(null);setPointSearch('');onChange({...form,city:e.target.value,address:''});}}/></label>
  {!useManual&&!selectedCity&&cities.data&&cities.data.length>0&&<label>Оберіть населений пункт зі списку<select value="" onChange={e=>{const city=cities.data.find(c=>c.id===e.target.value);if(city){setSelectedCity(city);onChange({...form,city:city.label.slice(0,120),address:''});}}}><option value="" disabled>Оберіть місто / село та область</option>{cities.data.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
  {type==='courier'||useManual?<label>{type==='courier'?'Вулиця, будинок, квартира':`${pointLabel}: номер та адреса${carrier==='ukrposhta'?', індекс':''}`}<input required maxLength={300} value={form.address} autoComplete={type==='courier'?'street-address':'off'} onChange={e=>onChange({...form,address:e.target.value})}/></label>:<>
   <label>Пошук: {pointLabel.toLowerCase()}<input value={pointSearch} maxLength={120} disabled={!selectedCity||disabled} placeholder="Номер або вулиця" onChange={e=>{setPointSearch(e.target.value);onChange({...form,address:''});}}/></label>
   <label>{pointLabel}<select required value={form.address} disabled={!selectedCity||points.isFetching||disabled} onChange={e=>onChange({...form,address:e.target.value})}><option value="">{!selectedCity?'Спочатку оберіть населений пункт':points.isFetching?'Завантаження…':'Оберіть зі списку'}</option>{points.data?.map(p=><option key={p.id} value={p.label.slice(0,300)}>{p.label}</option>)}</select></label>
  </>}
  <p className={styles.help} role="status">{status.isPending?'Перевірка довідників…':status.isError?'Не вдалося перевірити довідники. Доступне ручне введення.':!configured?'Довідник перевізника ще не підключений. Вкажіть адресу вручну.':cities.isError||points.isError?'Не вдалося завантажити довідник. Спробуйте ще раз або введіть адресу вручну.':cities.isFetching?'Шукаємо населені пункти…':!manual&&!selectedCity&&cityQuery.length>=2&&cities.isSuccess&&!cities.data?.length?'Населений пункт не знайдено. Уточніть назву або введіть адресу вручну.':!manual&&selectedCity&&type!=='courier'&&points.isSuccess&&!points.data?.length?'Пунктів отримання не знайдено. Змініть пошук або спосіб доставки.':'Вартість і доступність доставки уточнимо під час підтвердження.'}</p>
  {configured&&<button type="button" className={styles.toggle} onClick={()=>{setManual(!manual);setSelectedCity(null);setPointSearch('');onChange({...form,city:'',address:''});}}>{manual?'Обрати з довідника':'Ввести адресу вручну'}</button>}
 </fieldset>;
}
