'use client';
import {useState} from 'react';
interface Props{image:string;images?:string[];alt:string;className?:string;loading?:'lazy'|'eager';}
function Photo({sources,alt,className,loading}:{sources:string[]}&Omit<Props,'image'|'images'>){
 const [index,setIndex]=useState(0);
 if(!sources[index])return <div className={className} role="img" aria-label={alt+' — фото готується'}><span>Фото готується</span></div>;
 return <img className={className} src={sources[index]} alt={alt} loading={loading} onError={()=>setIndex(current=>current+1)}/>;
}
export default function ProductPhoto({image,images,alt,className,loading='lazy'}:Props){
 const sources=[...new Set([image,...(images||[])].filter(Boolean))];
 return <Photo key={JSON.stringify(sources)} sources={sources} alt={alt} className={className} loading={loading}/>;
}
