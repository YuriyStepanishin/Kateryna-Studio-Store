import test from 'node:test';
import assert from 'node:assert/strict';
import {IncomingMessage,ServerResponse} from 'node:http';
import {Socket} from 'node:net';
import {hairArticles} from './src/content/hairArticles.js';
import {publishHairArticles,articleHash} from './src/services/publishHairArticles.js';
import {articleRepository} from './src/models/articles.js';
import {createApp} from './src/app.js';
import {getPool,closePool} from './src/config/db.js';
import {signSession} from './src/services/tokens.js';
const required=['id','slug','title','excerpt','body','category','author','seo_title','seo_description','sources','content_hash','status','published_at','created_at','updated_at'];
function database({schema=required.map(column_name=>({table_name:'blog_posts',column_name})),failAt,corruptRead=false}={}){
 let saved=new Map(),snapshot;const calls=[];let released=false;
 const client={async query(sql,args=[]){
  calls.push({sql,args});
  if(sql==='BEGIN')snapshot=new Map(saved);
  if(sql==='ROLLBACK')saved=new Map(snapshot);
  if(sql.includes('information_schema.columns'))return {rows:schema};
  if(sql.startsWith('SELECT id,slug,title,content_hash'))return {rows:[...saved.values()].filter(r=>r.slug===args[0]||r.title.toLowerCase()===args[1].toLowerCase()||r.content_hash===args[2])};
  if(sql.startsWith('INSERT INTO public.blog_posts')){
   if(failAt&&saved.size===failAt)throw new Error('insert failure');
   const [slug,title,excerpt,body,category,author,seo_title,seo_description,sources,content_hash]=args;
   saved.set(slug,{id:slug,slug,title,excerpt,body,category,author,seo_title,seo_description,sources:JSON.parse(sources),content_hash,status:'published'});
  }
  if(sql.startsWith('UPDATE public.blog_posts')){const row=[...saved.values()].find(r=>r.id===args[0]);row.status='published';}
  if(sql.startsWith('SELECT slug,body'))return {rows:corruptRead?[]:[...saved.values()].filter(r=>args[0].includes(r.slug)&&r.status==='published')};
  return {rows:[]};
 },release(){released=true;}};
 return {pool:{connect:async()=>client},calls,rows:()=>[...saved.values()],released:()=>released};
}
test('seven distinct complete Ukrainian articles have SEO, original sections and HTTPS sources',()=>{
 assert.equal(hairArticles.length,7);assert.equal(new Set(hairArticles.map(a=>a.slug)).size,7);assert.equal(new Set(hairArticles.map(a=>articleHash(a.body))).size,7);
 for(const a of hairArticles){assert.match(a.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(a.body.split(/\s+/).length>=250);assert.ok(a.body.includes('## '));assert.match(a.body,/[іїєґ]/i);assert.ok(a.excerpt.length>50);assert.ok(a.seoTitle.length<=70);assert.ok(a.seoDescription.length<=160);assert.ok(a.sources.length>=2);for(const s of a.sources)assert.equal(new URL(s.url).protocol,'https:');}
});
test('publication inserts all seven, verifies before commit and reuses them on rerun',async()=>{
 const db=database();const first=await publishHairArticles(db.pool);
 assert.equal(first.inserted,7);assert.equal(first.published,7);assert.equal(db.calls.at(-1).sql,'COMMIT');assert.ok(db.released());assert.ok(db.calls.some(c=>c.sql.includes('pg_advisory_xact_lock')));
 const second=await publishHairArticles(db.pool);assert.equal(second.inserted,0);assert.equal(second.reused,7);assert.equal(db.rows().length,7);
 const insert=db.calls.find(c=>c.sql.startsWith('INSERT INTO public.blog_posts'));assert.equal(insert.args[3],hairArticles[0].body);assert.equal(JSON.parse(insert.args[8])[0].url,hairArticles[0].sources[0].url);
});
test('missing table is created transactionally and recorded in migration ledger',async()=>{
 const db=database({schema:[]});await publishHairArticles(db.pool);
 assert.ok(db.calls.some(c=>c.sql.includes('CREATE TABLE IF NOT EXISTS public.blog_posts')));
 assert.ok(db.calls.some(c=>c.sql.startsWith('INSERT INTO schema_migrations')&&c.args[0]==='005_blog_posts.sql'&&c.args[1].length===64));
});
test('an existing alternate article table or incompatible schema is never overwritten',async()=>{
 for(const schema of [[{table_name:'articles',column_name:'title'}],[{table_name:'blog_posts',column_name:'title'}]]){
  const db=database({schema});await assert.rejects(()=>publishHairArticles(db.pool),/schema|table/);assert.equal(db.calls.at(-1).sql,'ROLLBACK');assert.ok(!db.calls.some(c=>c.sql.includes('CREATE TABLE')));
 }
});
test('a failed insert or visibility check rolls back the entire publication',async()=>{
 for(const options of [{failAt:3},{corruptRead:true}]){const db=database(options);await assert.rejects(()=>publishHairArticles(db.pool));assert.equal(db.rows().length,0);assert.equal(db.calls.at(-1).sql,'ROLLBACK');assert.ok(db.released());}
});
test('changed articles with same slug, title or body are detected without replacing content',async()=>{
 for(const change of [{body:hairArticles[0].body+' Змінений текст.'},{slug:'inshyi-slug'},{title:'Інша назва'}]){
  const db=database();await publishHairArticles(db.pool);const edited=hairArticles.map((a,i)=>i? a:{...a,...change});await assert.rejects(()=>publishHairArticles(db.pool,edited),/conflict/);assert.equal(db.rows()[0].body,hairArticles[0].body);assert.equal(db.rows().length,7);
 }
});
test('public reads filter unpublished and future rows; detail uses a parameterized slug',async()=>{
 const calls=[];const repo=articleRepository({query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}});
 await repo.list();await repo.bySlug("x' OR true--");for(const c of calls)assert.ok(c.sql.includes("status='published' AND published_at<=now()"));assert.deepEqual(calls[1].args,["x' OR true--"]);assert.ok(!calls[1].sql.includes("x' OR true--"));
 const missing=articleRepository({query:async()=>{throw Object.assign(new Error('missing'),{code:'42P01'});}});assert.deepEqual(await missing.list(),[]);
});
function request(app,url,cookie,method='GET'){return new Promise((resolve,reject)=>{const req=new IncomingMessage(new Socket());req.method=method;req.url=url;req.headers=cookie?{cookie}:{};req.push(null);const res=new ServerResponse(req);res.end=function(body){this.finished=true;this.emit('finish');resolve({status:this.statusCode,body:body?JSON.parse(body.toString()):null});return this;};app.handle(req,res,reject);});}
test('article endpoints expose published data publicly, reject invalid slugs and protect publication',async()=>{
 const config={mode:'postgres',databaseUrl:'postgres://localhost/test',origins:[],accessSecret:'a'.repeat(48),refreshSecret:'b'.repeat(48)};
 const pool=getPool(config.databaseUrl);pool.query=async sql=>({rows:sql.includes('FROM users')?[{id:'11111111-1111-4111-8111-111111111111',role:'CUSTOMER'}]:sql.includes('FROM public.blog_posts')?[{slug:hairArticles[0].slug,title:hairArticles[0].title}]:[]});
 try{const app=createApp(config);assert.equal((await request(app,'/api/articles')).status,200);assert.equal((await request(app,'/api/articles/'+hairArticles[0].slug)).status,200);assert.equal((await request(app,'/api/articles/bad_slug')).status,404);assert.equal((await request(app,'/api/admin/articles/publish-hair-care',undefined,'POST')).status,401);const token=signSession({id:'11111111-1111-4111-8111-111111111111'},config).access;assert.equal((await request(app,'/api/admin/articles/publish-hair-care','kss_access='+token,'POST')).status,403);}finally{await closePool();}
});
