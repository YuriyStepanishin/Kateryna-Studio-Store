import {materializeProductCategories} from '../services/materializeProductCategories.js';
import {getPool,closePool} from '../config/db.js';
import {GROUP_SOURCES,productPath,categoryProducts,categoryPages} from '../services/productGroups.js';
const apply=process.argv.includes('--apply');
let client,locked=false;
const report=[];
try{
 client=await getPool().connect();
 const lock=await client.query('SELECT pg_try_advisory_lock(72619203) AS locked');if(!lock.rows[0].locked)throw Error('Group sync is already running');locked=true;
 const {rows}=await client.query(`SELECT id,characteristics->>'sourceUrl' AS url,characteristics->'sourceData'->>'url' AS fallback FROM products`);
 const byPath=new Map();for(const row of rows){const p=productPath(row.url||row.fallback||'');if(p){const values=byPath.get(p)||[];values.push(row.id);byPath.set(p,values);}}
 for(const group of GROUP_SOURCES){
  const item={group:group.name,matched:0,pages:0,status:'ok'};report.push(item);
  const queue=[group.url],visited=new Set(),ids=new Set();
  try{
   while(queue.length){
    const page=queue.shift();if(visited.has(page))continue;visited.add(page);
    const response=await fetch(page,{signal:AbortSignal.timeout(20000),redirect:'error'});if(!response.ok)throw Error('HTTP '+response.status);
    const html=await response.text();item.pages++;
    for(const path of categoryProducts(html,page))for(const id of byPath.get(path)||[])ids.add(id);
    for(const next of categoryPages(html,group.url))if(!visited.has(next))queue.push(next);
    if(visited.size>=100&&queue.length)throw Error('Pagination limit reached');
   }
   item.matched=ids.size;
   if(!ids.size){item.status='no_matches';continue;}
   if(apply){
    await client.query(`UPDATE products SET characteristics=jsonb_set(COALESCE(characteristics,'{}'::jsonb),'{sourceGroups}',
      (SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements((CASE WHEN jsonb_typeof(characteristics->'sourceGroups')='array' THEN characteristics->'sourceGroups' ELSE '[]'::jsonb END)||$1::jsonb)))
      WHERE id=ANY($2::uuid[])`,[JSON.stringify([group.name]),[...ids]]);
   }
  }catch(e){item.status='error';item.reason=e.cause?.code||e.code||e.message;}
  console.log(JSON.stringify(item));
 }
 let categories;
 if(apply){await client.query('BEGIN');try{categories=await materializeProductCategories(client);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}}
 console.log(JSON.stringify({mode:apply?'apply':'preview',categories,report}));
 if(!apply)console.log('Записати групи у БД: npm run catalog:groups -- --apply');
 if(report.some(r=>r.status==='error'))process.exitCode=1;
}catch(e){console.error('Group sync failed. Code:',e.code||e.cause?.code||'SYNC_ERROR');process.exitCode=1;}
finally{try{if(locked)await client.query('SELECT pg_advisory_unlock(72619203)');}finally{client?.release();await closePool();}}
