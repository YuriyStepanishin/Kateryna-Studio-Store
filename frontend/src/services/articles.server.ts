import 'server-only';
import type {Article,ArticleSummary} from '@/types/articles';
import type {MediaItem} from '@/types/store';
async function apiOrigin(){
 if(process.env.NODE_ENV!=='production')return (process.env.API_ORIGIN||'http://127.0.0.1:5173').replace(/\/$/,'');
 const deployment=process.env.VERCEL_URL;
 if(!deployment)throw new Error('VERCEL_URL is required to load articles in production.');
 return `https://${deployment}`;
}
export async function getArticles():Promise<ArticleSummary[]>{
 const response=await fetch(await apiOrigin()+'/api/articles',{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Не вдалося завантажити статті.');
 return response.json();
}
export async function getMedia():Promise<MediaItem[]>{
 const response=await fetch(await apiOrigin()+'/api/catalog',{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Не вдалося завантажити фото та відео.');
 return ((await response.json()) as {media?:MediaItem[]}).media??[];
}
export async function getArticle(slug:string):Promise<Article|null>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>180)return null;
 const response=await fetch(await apiOrigin()+'/api/articles/'+encodeURIComponent(slug),{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(response.status===404)return null;
 if(!response.ok)throw new Error('Не вдалося завантажити статтю.');
 return response.json();
}
