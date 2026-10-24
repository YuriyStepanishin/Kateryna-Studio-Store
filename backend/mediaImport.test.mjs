import test from 'node:test';
import assert from 'node:assert/strict';
import {hairMedia} from './src/content/hairMedia.js';
import {createMediaVerifier,youtubeVideoId,EDITORIAL_FOLDER} from './src/services/mediaVerifier.js';
import {importHairMedia} from './src/services/importHairMedia.js';
import {contentRepository} from './src/models/content.js';
const photo=hairMedia.find(i=>i.type==='photo'),video=hairMedia.find(i=>i.type==='video');
const cloudAsset=item=>({public_id:EDITORIAL_FOLDER+'/editorial-hair-pexels-'+item.key.slice(7),secure_url:'https://res.cloudinary.com/test/image/upload/'+item.key.slice(7)+'.jpg',width:1067,height:1600,asset_folder:EDITORIAL_FOLDER});
test('selection contains exactly 4 real YouTube videos and 10 distinct licensed Pexels photos',()=>{
 assert.equal(hairMedia.filter(x=>x.type==='video').length,4);assert.equal(hairMedia.filter(x=>x.type==='photo').length,10);assert.equal(new Set(hairMedia.map(x=>x.key)).size,14);
 for(const item of hairMedia){assert.match(item.title,/[А-Яа-яІіЇїЄєҐґ]/);if(item.type==='video')assert.equal(youtubeVideoId(item.url),item.key.slice(8));else{assert.equal(new URL(item.url).hostname,'images.pexels.com');assert.equal(item.source.licenseUrl,'https://www.pexels.com/license/');}assert.ok(item.source.author&&item.source.page);}
});
test('YouTube aliases normalize safely without accepting unrelated hosts',()=>{
 for(const url of ['https://youtu.be/1xM7LcpMpGg','https://www.youtube.com/watch?v=1xM7LcpMpGg','https://www.youtube.com/shorts/1xM7LcpMpGg','https://www.youtube-nocookie.com/embed/1xM7LcpMpGg'])assert.equal(youtubeVideoId(url),'1xM7LcpMpGg');
 for(const url of ['https://evil.example/watch?v=1xM7LcpMpGg','javascript:alert(1)','http://youtu.be/1xM7LcpMpGg'])assert.equal(youtubeVideoId(url),null);
});
test('video verification requires a matching author and embeddable oEmbed response',async()=>{
 const result={type:'video',provider_name:'YouTube',author_name:video.source.author,title:'Original title',html:'<iframe src="https://www.youtube.com/embed/'+youtubeVideoId(video.url)+'"></iframe>'};
 const verifier=createMediaVerifier({fetcher:async url=>{assert.equal(new URL(url).hostname,'www.youtube.com');return {ok:true,json:async()=>result};}});
 assert.equal((await verifier.video(video)).verification.originalTitle,'Original title');result.author_name='Unrelated author';await assert.rejects(()=>verifier.video(video),{status:502});
});
test('photos use the current Cloudinary folder, preserve source credits, and reuse deterministic assets',async()=>{
 let uploadCount=0,options;
 const asset=cloudAsset(photo);let exists=false;
 const cloudinary={api:{resource:async()=>{if(exists)return asset;throw {http_code:404};}},uploader:{upload:async(url,input)=>{uploadCount++;options=input;assert.equal(url,photo.url);exists=true;return asset;}}};
 const verifier=createMediaVerifier({cloudinary});assert.equal((await verifier.photo(photo)).reused,false);assert.equal((await verifier.photo(photo)).reused,true);assert.equal(uploadCount,1);assert.equal(options.asset_folder,EDITORIAL_FOLDER);assert.equal(options.overwrite,false);assert.equal(options.context.credit,photo.source.author);
});
test('small, misplaced and invalid images are rejected; non-404 Cloudinary errors never trigger uploads',async()=>{
 for(const changes of [{width:200},{asset_folder:'wrong'},{secure_url:'http://unsafe.example/a.jpg'}]){
  const verifier=createMediaVerifier({cloudinary:{api:{resource:async()=>({...cloudAsset(photo),...changes})}}});await assert.rejects(()=>verifier.photo(photo),{status:502});
 }
 let uploads=0;const verifier=createMediaVerifier({cloudinary:{api:{resource:async()=>{throw {http_code:429};}},uploader:{upload:async()=>{uploads++;}}}});await assert.rejects(()=>verifier.photo(photo));assert.equal(uploads,0);
 await assert.rejects(()=>verifier.photo({...photo,url:'https://internal.example/a.jpg'}),{status:502});
});
function database({failAt,acquired=true,columns=['id','title','type','url','cover','is_active','sort_order','created_at']}={}){
 let rows=[],snapshot;const calls=[];let released=false;
 const client={async query(sql,args=[]){calls.push({sql,args});
  if(sql.includes('information_schema.columns'))return {rows:columns.map(column_name=>({column_name}))};
  if(sql.includes('pg_try_advisory_lock'))return {rows:[{acquired}]};
  if(sql==='BEGIN')snapshot=structuredClone(rows);
  if(sql==='ROLLBACK')rows=structuredClone(snapshot);
  if(sql.startsWith('SELECT checksum'))return {rows:[]};
  if(sql.startsWith('SELECT id,type,url,source_key'))return {rows:sql.includes('ANY')?rows.filter(r=>r.is_active&&args[0].includes(r.source_key)):rows};
  if(sql.startsWith('INSERT INTO public.site_media')){if(failAt&&rows.length===failAt)throw new Error('insert failure');const [title,type,url,cover,sort_order,source_key,source]=args;rows.push({id:String(rows.length+1),title,type,url,cover,sort_order,source_key,source:JSON.parse(source),is_active:true});}
  if(sql.startsWith('UPDATE public.site_media')){const row=rows.find(r=>r.id===args[0]);Object.assign(row,{is_active:true,source_key:args[1],source:JSON.parse(args[2])});}
  return {rows:[]};
 },release(){released=true;}};
 return {pool:{connect:async()=>client},calls,rows:()=>rows,seed:value=>rows.push(value),released:()=>released};
}
const verifiedAssets={video:async item=>({url:item.url,cover:'',verification:{checkedAt:'test'}}),photo:async item=>({url:cloudAsset(item).secure_url,cover:cloudAsset(item).secure_url,reused:false,verification:{publicId:cloudAsset(item).public_id}})};
test('import verifies first and atomically publishes 14 records; rerun and YouTube aliases do not duplicate',async()=>{
 const db=database();const first=await importHairMedia(db.pool,{verifier:verifiedAssets});assert.equal(first.inserted,14);assert.equal(first.photos,10);assert.equal(first.verified,14);assert.ok(db.released());
 const savedVideo=db.rows().find(r=>r.type==='video');savedVideo.url='https://youtu.be/'+youtubeVideoId(savedVideo.url);
 const second=await importHairMedia(db.pool,{verifier:verifiedAssets});assert.equal(second.inserted,0);assert.equal(second.reused,14);assert.equal(db.rows().length,14);assert.ok(db.rows().every(r=>r.source.key===r.source_key));
 assert.ok(db.calls.some(c=>c.sql==='SELECT pg_advisory_unlock(72619206)'));
});
test('database/schema and concurrent import failures happen before uploads',async()=>{
 let uploads=0;const verifier={...verifiedAssets,photo:async()=>{uploads++;}};
 for(const options of [{columns:[]},{acquired:false}]){const db=database(options);await assert.rejects(()=>importHairMedia(db.pool,{verifier}));assert.equal(uploads,0);assert.ok(db.released());}
 await assert.rejects(()=>importHairMedia({connect:async()=>{throw Object.assign(new Error('dns'),{code:'ENOTFOUND'});}},{verifier}),{code:'ENOTFOUND'});assert.equal(uploads,0);
});
test('failed video validation does not upload photos or insert media; insert errors roll back all media',async()=>{
 const db=database();let uploads=0;
 await assert.rejects(()=>importHairMedia(db.pool,{verifier:{video:async()=>{throw new Error('unavailable');},photo:async()=>{uploads++;}}}));assert.equal(uploads,0);assert.equal(db.rows().length,0);
 const failed=database({failAt:7});await assert.rejects(()=>importHairMedia(failed.pool,{verifier:verifiedAssets}));assert.equal(failed.rows().length,0);assert.ok(failed.calls.some(c=>c.sql==='ROLLBACK'));
});
test('manual replacements preserve existing media and roll back the import',async()=>{
 const db=database();db.seed({id:'manual',source_key:video.key,type:'video',url:'https://youtu.be/aaaaaaaaaaa',is_active:true});await assert.rejects(()=>importHairMedia(db.pool,{verifier:verifiedAssets}),{status:409});assert.equal(db.rows().length,1);assert.equal(db.rows()[0].url,'https://youtu.be/aaaaaaaaaaa');
});
test('storefront content exposes credits and selects only active media',async()=>{
 const calls=[];const repo=contentRepository({query:async sql=>{calls.push(sql);return {rows:sql.includes('FROM site_media')?[{id:'x',source:{key:photo.key}}]:[]};}});
 assert.equal((await repo.publicContent()).media[0].source.key,photo.key);assert.ok(calls.some(sql=>sql.includes("to_jsonb(site_media)->'source'")&&sql.includes('WHERE is_active')));
});
