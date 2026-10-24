import {getPool,closePool} from '../config/db.js';
import {hairArticles} from '../content/hairArticles.js';
import {inspectArticleSchema,publishHairArticles} from '../services/publishHairArticles.js';
import {articleRepository} from '../models/articles.js';
try{
 const pool=getPool();
 const schema=await inspectArticleSchema(pool);
 console.log(JSON.stringify({schema,mode:process.argv.includes('--apply')?'apply':'preview'},null,2));
 if(process.argv.includes('--apply')){
  const result=await publishHairArticles(pool);
  console.log(JSON.stringify({committed:true,...result},null,2));
  const repo=articleRepository(pool);const visible=await repo.list();
  const verified=await Promise.all(result.slugs.map(slug=>repo.bySlug(slug)));
  if(verified.some(a=>!a?.body||!visible.some(v=>v.slug===a.slug)))throw new Error('Committed, but public read verification failed');
  console.log(JSON.stringify({verifiedPublicReads:verified.length,urls:result.slugs.map(slug=>'/blog/'+slug)},null,2));
 }else console.log(JSON.stringify({articles:hairArticles.map(({slug,title})=>({slug,title})),command:'npm run blog:publish -- --apply'},null,2));
}catch(error){console.error('Статті: операцію не завершено. Код:',error.code||error.message);process.exitCode=1;}finally{await closePool();}
