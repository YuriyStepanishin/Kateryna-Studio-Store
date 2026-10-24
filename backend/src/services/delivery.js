// Only address directories: these requests do not create shipments.
const fail=(message,status=503)=>Object.assign(new Error(message),{status});
const list=value=>Array.isArray(value)?value:value?[value]:[];
const ua=value=>typeof value==='string'?value:value?.ua||'';
export function createDeliveryService({env=process.env,fetcher=fetch}={}){
 const cache=new Map();
 const configured=carrier=>carrier==='meest'||Boolean(env[carrier==='nova_poshta'?'NOVA_POSHTA_API_KEY':'UKRPOSHTA_BEARER']);
 async function request(url,options={}){
  try{
   const response=await fetcher(url,{...options,signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('upstream');
   return await response.json();
  }catch{throw fail('Довідник перевізника тимчасово недоступний. Введіть адресу вручну.');}
 }
 async function np(method,properties){
  const data=await request('https://api.novaposhta.ua/v2.0/json/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:env.NOVA_POSHTA_API_KEY,modelName:'Address',calledMethod:method,methodProperties:properties})});
  if(!data.success||!Array.isArray(data.data))throw fail('Нова пошта не надала довідник. Перевірте API-ключ на сервері.');
  return data.data;
 }
 async function up(method,params){
  const data=await request('https://www.ukrposhta.ua/address-classifier-ws/'+method+'?'+new URLSearchParams(params),{headers:{Accept:'application/json',Authorization:`Bearer ${env.UKRPOSHTA_BEARER}`}});
  if(!data.Entries||!Object.hasOwn(data.Entries,'Entry'))throw fail('Укрпошта повернула некоректну відповідь довідника.');
  return list(data.Entries.Entry);
 }
 async function meest(city,type){
  const data=await request('https://publicapi.meest.com/branches?'+new URLSearchParams({city,lang:'ua',viewdata:'full',...(type?{type:type==='locker'?'poshtomat':'minibranch,mainbranch,cargobranch,internationalcargobranch'}:{})}));
  if(Number(data.status)!==1||!Array.isArray(data.result))throw fail('Meest не надав довідник. Введіть адресу вручну.');
  return data.result;
 }
 return {
  status:()=>Object.fromEntries(['nova_poshta','ukrposhta','meest'].map(carrier=>[carrier,{configured:configured(carrier)}])),
  async lookup({carrier,kind,q='',cityRef='',regionRef='',type='branch'}){
   if(!['nova_poshta','ukrposhta','meest'].includes(carrier)||!['cities','points'].includes(kind)||!['branch','locker'].includes(type)||(carrier==='ukrposhta'&&type==='locker'))throw fail('Некоректні параметри доставки.',400);
   for(const v of [q,cityRef,regionRef])if(typeof v!=='string'||v.length>120)throw fail('Некоректний пошуковий запит.',400);
   if(!configured(carrier))throw fail('Довідник цього перевізника ще не налаштований. Введіть адресу вручну.');
   if(kind==='cities'&&q.trim().length<2)return [];
   if(kind==='points'&&!cityRef)throw fail('Спочатку оберіть населений пункт.',400);
   const key=JSON.stringify([carrier,kind,q,cityRef,regionRef,type]);const hit=cache.get(key);
   if(hit&&hit.until>Date.now())return hit.value;
   let value;
   if(carrier==='nova_poshta'){
    if(kind==='cities')value=(await np('getCities',{FindByString:q,Limit:'30',Page:'1'})).map(r=>({id:r.Ref,label:[r.Description,r.AreaDescription,r.SettlementTypeDescription].filter(Boolean).join(', ')}));
    else{
     value=[];
     // Large cities span several pages; the first page can contain no lockers.
     for(let page=1;page<=20;page++){
      const rows=await np('getWarehouses',{CityRef:cityRef,FindByString:q,Limit:'500',Page:String(page),WarehouseStatus:'Working'});
      value.push(...rows.filter(r=>(r.CategoryOfWarehouse==='Postomat'||/поштомат/i.test(r.Description))===(type==='locker')).map(r=>({id:r.Ref,label:r.Description})));
      if(value.length>=100||rows.length<500)break;
     }
    }
   }else if(carrier==='ukrposhta'){
    if(kind==='cities')value=(await up('get_city_by_region_id_and_district_id_and_city_ua',{city_ua:q})).map(r=>({id:r.CITY_ID,regionRef:r.REGION_ID,label:[r.CITY_UA,r.REGION_UA,r.DISTRICT_UA].filter(Boolean).join(', ')}));
    else{
     if(!regionRef)throw fail('Повторно оберіть населений пункт.',400);
     value=(await up('get_postoffices_by_city_id',{city_id:cityRef,region_id:regionRef})).filter(r=>String(r.LOCK_CODE)==='0'&&String(r.IS_SECURITY)!=='1').map(r=>({id:r.ID,label:[r.POSTINDEX,r.PO_SHORT,r.ADDRESS].filter(Boolean).join(', ')}));
    }
   }else{
    const rows=await meest(kind==='cities'?q:cityRef,kind==='points'?type:undefined);
    value=kind==='cities'?[...new Map(rows.map(r=>[r.city_id,{id:r.city_id,label:[ua(r.city),ua(r.region),ua(r.district)].filter(Boolean).join(', ')}])).values()]:rows.map(r=>({id:r.br_id||r.num,label:[`${type==='locker'?'Поштомат':'Відділення'} №${r.num_showcase}`,ua(r.street),r.street_number].filter(Boolean).join(', ')}));
   }
   value=value.filter(r=>r.id&&r.label).filter(r=>kind==='cities'||!q||r.label.toLocaleLowerCase('uk').includes(q.toLocaleLowerCase('uk'))).slice(0,100).map(r=>({...r,id:String(r.id)}));
   if(cache.size>=200)cache.delete(cache.keys().next().value);
   cache.set(key,{until:Date.now()+300000,value});return value;
  }
 };
}
