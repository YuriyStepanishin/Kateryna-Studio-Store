import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hairMedia} from '../content/hairMedia.js';
import {youtubeVideoId,createMediaVerifier} from './mediaVerifier.js';
const migrationName='006_media_sources.sql';
export async function inspectMediaSchema(client){return (await client.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='site_media' ORDER BY ordinal_position")).rows;}
export async function importHairMedia(pool,{verifier=createMediaVerifier(),items=hairMedia,onProgress=()=>{}}={}){
 if(items.length!==14||items.filter(x=>x.type==='video').length!==4||items.filter(x=>x.type==='photo').length!==10||new Set(items.map(x=>x.key)).size!==14)throw new Error('Expected 4 unique videos and 10 unique photos');
 const client=await pool.connect();let locked=false,inTransaction=false;
 try{
  // Check access and schema before any external uploads.
  const columns=await inspectMediaSchema(client);
  if(['id','title','type','url','cover','is_active','sort_order','created_at'].some(name=>!columns.some(c=>c.column_name===name)))throw Object.assign(new Error('Оновіть схему контенту: npm run db:migrate.'),{status:503});
  const {rows}=await client.query('SELECT pg_try_advisory_lock(72619206) AS acquired');
  if(!rows[0]?.acquired)throw Object.assign(new Error('Імпорт медіа вже виконується. Зачекайте завершення.'),{status:409});locked=true;
  await client.query('BEGIN');inTransaction=true;
  await client.query('SELECT pg_advisory_xact_lock(72619201)');
  const sql=await readFile(new URL('../../migrations/'+migrationName,import.meta.url),'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied=(await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[migrationName])).rows[0];
  if(applied&&applied.checksum!==checksum)throw new Error('Applied media migration checksum mismatch');
  if(!applied){await client.query(sql);await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[migrationName,checksum]);}
  await client.query('COMMIT');inTransaction=false;
  const verified=[];let uploaded=0,reusedAssets=0;
  // Validate all four embeds before uploading photos. No video files are copied.
  for(const item of [...items].sort((a,b)=>Number(b.type==='video')-Number(a.type==='video'))){
   const asset=await verifier[item.type](item);
   if(item.type==='photo'){if(asset.reused)reusedAssets++;else uploaded++;}
   verified.push({...item,...asset,source:{...item.source,key:item.key,description:item.description,verification:asset.verification}});
   onProgress({checked:verified.length,total:items.length,key:item.key});
  }
  await client.query('BEGIN');inTransaction=true;let inserted=0,reused=0;
  for(const item of verified){
   const existing=(await client.query('SELECT id,type,url,source_key FROM public.site_media FOR UPDATE')).rows.filter(row=>row.source_key===item.key||row.url===item.url||(item.type==='video'&&row.type==='video'&&youtubeVideoId(row.url)===youtubeVideoId(item.url)));
   if(existing.length){
    if(existing.length!==1||existing[0].type!==item.type||(existing[0].url!==item.url&&(item.type!=='video'||youtubeVideoId(existing[0].url)!==youtubeVideoId(item.url)))||(existing[0].source_key&&existing[0].source_key!==item.key))throw Object.assign(new Error('Медіазапис змінено вручну; імпорт зупинено: '+item.key),{status:409});
    await client.query('UPDATE public.site_media SET is_active=true,source_key=$2,source=$3::jsonb WHERE id=$1',[existing[0].id,item.key,JSON.stringify(item.source)]);reused++;
   }else{
    await client.query('INSERT INTO public.site_media(title,type,url,cover,is_active,sort_order,source_key,source) VALUES($1,$2,$3,$4,true,$5,$6,$7::jsonb)',[item.title,item.type,item.url,item.cover,item.sortOrder,item.key,JSON.stringify(item.source)]);inserted++;
   }
  }
  const active=(await client.query('SELECT id,type,url,source_key FROM public.site_media WHERE source_key=ANY($1::text[]) AND is_active',[items.map(x=>x.key)])).rows;
  if(active.length!==14||active.filter(x=>x.type==='photo').length!==10||active.filter(x=>x.type==='video').length!==4||verified.some(v=>!active.some(a=>a.source_key===v.key&&(a.url===v.url||(v.type==='video'&&youtubeVideoId(a.url)===youtubeVideoId(v.url))))))throw new Error('Media publication verification failed');
  await client.query('COMMIT');inTransaction=false;
  return {inserted,reused,uploaded,reusedAssets,videos:4,photos:10,verified:active.length,keys:items.map(x=>x.key)};
 }catch(error){if(inTransaction)await client.query('ROLLBACK');throw error;}
 finally{try{if(locked)await client.query('SELECT pg_advisory_unlock(72619206)');}finally{client.release();}}
}
