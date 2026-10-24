import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeliveryService} from './src/services/delivery.js';
import {validateDelivery} from './src/validators/delivery.js';
const ok=data=>({ok:true,json:async()=>data});
test('lockers accepted for NP/Meest, not offered for Ukrposhta',()=>{
 for(const carrier of ['nova_poshta','meest'])assert.equal(validateDelivery({deliveryCarrier:carrier,deliveryType:'locker'}).method,carrier+':locker');
 assert.throws(()=>validateDelivery({deliveryCarrier:'ukrposhta',deliveryType:'locker'}),{status:400});
});
test('status reveals only configuration flags and missing credentials prevent upstream requests',async()=>{
 const service=createDeliveryService({env:{},fetcher:()=>{throw new Error('must not call');}});
 assert.deepEqual(service.status(),{nova_poshta:{configured:false},ukrposhta:{configured:false},meest:{configured:true}});
 await assert.rejects(()=>service.lookup({carrier:'nova_poshta',kind:'cities',q:'Ки'}),{status:503});
});
test('NP maps cities and caches response without exposing key',async()=>{
 let calls=0;
 const service=createDeliveryService({env:{NOVA_POSHTA_API_KEY:'secret'},fetcher:async(url,options)=>{calls++;assert.equal(url,'https://api.novaposhta.ua/v2.0/json/');const body=JSON.parse(options.body);assert.equal(body.apiKey,'secret');assert.equal(body.calledMethod,'getCities');assert.equal(body.methodProperties.FindByString,'Ки');return ok({success:true,data:[{Ref:'city',Description:'Київ',AreaDescription:'Київська'}]});}});
 const query={carrier:'nova_poshta',kind:'cities',q:'Ки'};
 assert.deepEqual(await service.lookup(query),[{id:'city',label:'Київ, Київська'}]);await service.lookup(query);assert.equal(calls,1);
});
test('NP separates lockers from branches',async()=>{
 const service=createDeliveryService({env:{NOVA_POSHTA_API_KEY:'secret'},fetcher:async()=>ok({success:true,data:[{Ref:'locker',Description:'Поштомат №1',CategoryOfWarehouse:'Postomat'},{Ref:'branch',Description:'Відділення №1',CategoryOfWarehouse:'Branch'}]})});
 for(const type of ['locker','branch'])assert.equal((await service.lookup({carrier:'nova_poshta',kind:'points',cityRef:'city',type}))[0].id,type);
});
test('Meest requires no credentials, deduplicates city ids, requests lockers explicitly',async()=>{
 const calls=[];const row={city_id:'city',city:{ua:'Львів'},region:{ua:'Львівська'},br_id:'locker',num_showcase:10,street:{ua:'вул. Миру'},street_number:'1'};
 const service=createDeliveryService({env:{},fetcher:async(url)=>{calls.push(new URL(url));return ok({status:1,result:[row,row]});}});
 assert.deepEqual(await service.lookup({carrier:'meest',kind:'cities',q:'Ль'}),[{id:'city',label:'Львів, Львівська'}]);
 assert.equal((await service.lookup({carrier:'meest',kind:'points',cityRef:'city',type:'locker'}))[0].label,'Поштомат №10, вул. Миру, 1');
 assert.equal(calls[1].searchParams.get('type'),'poshtomat');assert.equal(calls[1].searchParams.get('city'),'city');
});
test('Ukrposhta sends bearer server-side, handles singleton cities and filters closed offices',async()=>{
 const service=createDeliveryService({env:{UKRPOSHTA_BEARER:'secret'},fetcher:async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer secret');assert.equal(new URL(url).hostname,'www.ukrposhta.ua');return ok({Entries:{Entry:url.includes('get_city_')?{CITY_ID:'1',REGION_ID:'2',CITY_UA:'Київ'}:[{ID:'3',POSTINDEX:'01001',PO_SHORT:'Київ 1',ADDRESS:'Хрещатик, 22',LOCK_CODE:'0',IS_SECURITY:'0'},{ID:'closed',LOCK_CODE:'1'},{ID:'restricted',LOCK_CODE:'0',IS_SECURITY:'1'}]}});}});
 assert.deepEqual(await service.lookup({carrier:'ukrposhta',kind:'cities',q:'Ки'}),[{id:'1',regionRef:'2',label:'Київ'}]);
 assert.deepEqual(await service.lookup({carrier:'ukrposhta',kind:'points',cityRef:'1',regionRef:'2'}),[{id:'3',label:'01001, Київ 1, Хрещатик, 22'}]);
});
test('invalid parameters never reach carrier API',async()=>{
 const service=createDeliveryService({env:{},fetcher:()=>{throw new Error('must not call');}});
 for(const query of [{carrier:'unknown',kind:'cities'},{carrier:'meest',kind:'points'},{carrier:'meest',kind:'cities',q:['city']},{carrier:'meest',kind:'cities',q:'x'.repeat(121)},{carrier:'ukrposhta',kind:'points',type:'locker'}])await assert.rejects(()=>service.lookup(query),{status:400});
});
test('network errors and carrier failures are safe and never cached',async()=>{
 let calls=0;const service=createDeliveryService({env:{},fetcher:async()=>{calls++;throw new Error('private upstream details');}});
 for(let i=0;i<2;i++)await assert.rejects(()=>service.lookup({carrier:'meest',kind:'cities',q:'Ль'}),error=>error.status===503&&!error.message.includes('private'));
 assert.equal(calls,2);
 const rejected=createDeliveryService({env:{NOVA_POSHTA_API_KEY:'secret'},fetcher:async()=>ok({success:false,errors:['secret']})});
 await assert.rejects(()=>rejected.lookup({carrier:'nova_poshta',kind:'cities',q:'Ки'}),error=>error.status===503&&!error.message.includes('secret'));
});
test('NP searches later pages when first page contains only branches',async()=>{
 let calls=0;
 const service=createDeliveryService({env:{NOVA_POSHTA_API_KEY:'secret'},fetcher:async(url,options)=>{calls++;const page=JSON.parse(options.body).methodProperties.Page;return ok({success:true,data:page==='1'?Array.from({length:500},(_,i)=>({Ref:String(i),Description:'Відділення',CategoryOfWarehouse:'Branch'})):[{Ref:'locker',Description:'Поштомат №501',CategoryOfWarehouse:'Postomat'}]});}});
 assert.deepEqual(await service.lookup({carrier:'nova_poshta',kind:'points',cityRef:'city',type:'locker'}),[{id:'locker',label:'Поштомат №501'}]);assert.equal(calls,2);
});
