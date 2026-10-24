import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hairArticles} from '../content/hairArticles.js';
const migrationName='005_blog_posts.sql';
const requiredColumns=['id','slug','title','excerpt','body','category','author','seo_title','seo_description','sources','content_hash','status','published_at','created_at','updated_at'];
export const articleHash=body=>createHash('sha256').update(body.trim().replace(/\r\n/g,'\n')).digest('hex');
export async function inspectArticleSchema(client){
 return (await client.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('blog_posts','articles','posts','blog_articles') ORDER BY table_name,ordinal_position")).rows;
}
export async function publishHairArticles(pool,articles=hairArticles){
 if(articles.length!==7||new Set(articles.map(a=>a.slug)).size!==7)throw new Error('Expected seven articles with unique slugs');
 for(const a of articles){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug)||!a.title||!a.excerpt||a.body.length<1000||!a.seoTitle||!a.seoDescription||!a.sources.length)throw new Error('Incomplete article: '+a.slug);}
 const client=await pool.connect();let inserted=0,reused=0;
 try{
  await client.query('BEGIN');
  // Coordinates with the repository migration runner and concurrent imports.
  await client.query('SELECT pg_advisory_xact_lock(72619201)');
  const schema=await inspectArticleSchema(client);
  const columns=schema.filter(c=>c.table_name==='blog_posts');
  if(!columns.length){
   if(schema.length)throw new Error('Existing article table detected; adapt to its schema before importing');
   const sql=await readFile(new URL('../../migrations/'+migrationName,import.meta.url),'utf8');
   await client.query(sql);
   await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
   await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2) ON CONFLICT(name) DO NOTHING',[migrationName,createHash('sha256').update(sql).digest('hex')]);
  }else{
   const missing=requiredColumns.filter(name=>!columns.some(c=>c.column_name===name));
   if(missing.length)throw new Error('Incompatible blog_posts schema; missing columns: '+missing.join(', '));
  }
  for(const article of articles){
   const hash=articleHash(article.body);
   const existing=(await client.query('SELECT id,slug,title,content_hash FROM public.blog_posts WHERE slug=$1 OR lower(title)=lower($2) OR content_hash=$3 FOR UPDATE',[article.slug,article.title,hash])).rows;
   if(existing.length){
    if(existing.length!==1||existing[0].slug!==article.slug||existing[0].title!==article.title||existing[0].content_hash!==hash)throw new Error('Article conflict; existing content preserved: '+article.slug);
    await client.query("UPDATE public.blog_posts SET status='published',published_at=COALESCE(published_at,now()),updated_at=now() WHERE id=$1 AND (status<>'published' OR published_at IS NULL)",[existing[0].id]);reused++;
   }else{
    await client.query("INSERT INTO public.blog_posts(slug,title,excerpt,body,category,author,seo_title,seo_description,sources,content_hash,status,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,'published',now())",[article.slug,article.title,article.excerpt,article.body,article.category,article.author,article.seoTitle,article.seoDescription,JSON.stringify(article.sources),hash]);inserted++;
   }
  }
  const rows=(await client.query("SELECT slug,body,excerpt,seo_title,seo_description,sources,content_hash FROM public.blog_posts WHERE slug=ANY($1::text[]) AND status='published' AND published_at<=now()",[articles.map(a=>a.slug)])).rows;
  if(rows.length!==7||articles.some(a=>!rows.some(r=>r.slug===a.slug&&articleHash(r.body)===articleHash(a.body)&&r.content_hash===articleHash(a.body)&&r.excerpt&&r.seo_title&&r.seo_description&&Array.isArray(r.sources)&&r.sources.length)))throw new Error('Article publication verification failed');
  await client.query('COMMIT');
  return {inserted,reused,published:rows.length,slugs:rows.map(r=>r.slug)};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
