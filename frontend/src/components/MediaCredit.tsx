import type {MediaItem} from '@/types/store';
function safeLink(value:string|undefined){try{return value&&new URL(value).protocol==='https:'?value:null;}catch{return null;}}
export default function MediaCredit({item,className}:{item:MediaItem;className?:string}){
 const source=item.source;if(!source)return null;const page=safeLink(source.page);const license=safeLink(source.licenseUrl);
 return <div className={className}>{source.description&&<p>{source.description}</p>}<p>{page?<a href={page} target="_blank" rel="noopener noreferrer">{source.author||source.provider||'Джерело'}</a>:source.author}{source.language&&<span> · {source.language==='uk'?'Українською':source.language==='en'?'Англійською':source.language}</span>}{license&&<> · <a href={license} target="_blank" rel="noopener noreferrer">{source.license||'Ліцензія'}</a></>}</p></div>;
}
