import 'server-only';
import type {Article,ArticleSummary} from '@/types/articles';
const origin=(process.env.API_ORIGIN||'http://127.0.0.1:5001').replace(/\/$/,'');
export async function getArticles():Promise<ArticleSummary[]>{
 const response=await fetch(origin+'/api/articles',{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Не вдалося завантажити статті.');
 return response.json();
}
export async function getArticle(slug:string):Promise<Article|null>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>180)return null;
 const response=await fetch(origin+'/api/articles/'+encodeURIComponent(slug),{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(response.status===404)return null;
 if(!response.ok)throw new Error('Не вдалося завантажити статтю.');
 return response.json();
}
