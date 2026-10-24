import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPool,closePool} from '../config/db.js';
const dir=new URL('../../import/',import.meta.url), records=new Map();
let skipped=0;
for(const file of (await readdir(dir)).filter(f=>f.endsWith('.json')).sort()){
 const rows=JSON.parse(await readFile(new URL(file,dir),'utf8'));
 if(!Array.isArray(rows))throw Error('Expected array: '+file);
 for(const r of rows){
  if(!r.title?.trim()||!r.url||!String(r.price??'').trim()){skipped++;continue;}
  if(new URL(r.url).protocol!=='https:')throw Error('Invalid source URL');
  const key=createHash('sha256').update(r.url).digest('hex').slice(0,24);
  const uah=/грн|UAH|₴/i.test(String(r.price));
  const price=Number(String(r.price).replace(/\s/g,'').replace(',','.').replace(/грн\.?|UAH|₴/gi,''));
  if(!Number.isFinite(price)||price<0)throw Error('Invalid price: '+r.title);
  const images=[...new Set((r.images||[]).filter(s=>{try{return new URL(s).protocol==='https:';}catch{return false;}}))];
  records.set(key,{r,uah,price,images,file});
 }
}
console.log(JSON.stringify({products:records.size,skipped,unknownCurrency:[...records.values()].filter(r=>!r.uah).length}));
if(process.argv.includes('--apply')){
 let client,inserted=0;
 try{
  client=await getPool().connect();await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('catalog-source-import'))");
  for(const [key,{r,uah,price,images,file}] of records){
   const brand=r.brand||'Import',slug='import-'+createHash('sha256').update(brand).digest('hex').slice(0,12);
   const cat=await client.query('INSERT INTO categories(name,slug) VALUES($1,$2) ON CONFLICT(slug) DO UPDATE SET slug=EXCLUDED.slug RETURNING id',[brand,slug]);
   const characteristics={...r.characteristics,brand,sourceUrl:r.url,sourcePrice:r.price,sourceCurrency:uah?'UAH':'UNKNOWN',sourceFile:file,sourceData:r};
   const p=await client.query('INSERT INTO products(category_id,name,slug,description,price,stock,sku,is_active,characteristics) VALUES($1,$2,$3,$4,$5,0,$6,false,$7) ON CONFLICT(sku) DO NOTHING RETURNING id',[cat.rows[0].id,r.title.trim(),'import-'+key,r.productDescription||r.description||'',uah?price:0,'IMPORT-'+key,JSON.stringify(characteristics)]);
   if(p.rowCount){inserted++;for(const [i,url] of images.entries())await client.query('INSERT INTO product_images(product_id,image_url,sort_order) VALUES($1,$2,$3)',[p.rows[0].id,url,i]);}
  }
  await client.query('COMMIT');console.log(JSON.stringify({inserted,alreadyPresent:records.size-inserted}));
 }catch(e){if(client)await client.query('ROLLBACK');console.error('Import failed; no changes committed. Code:',e.code||'IMPORT_ERROR');process.exitCode=1;}
 finally{client?.release();await closePool();}
}
