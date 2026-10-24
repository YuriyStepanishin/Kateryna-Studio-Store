import {useId} from 'react';
import {BRAND} from '@/constants/brand';
import styles from './BrandLogo.module.css';
export default function BrandLogo({className=''}:{className?:string}){
 const filterId=`brand-ink-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`;
 return <svg className={`${styles.logo} ${className}`} viewBox="290 650 1300 530" role="img" aria-label={BRAND.name} focusable="false">
  <defs>
   <filter id={filterId} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
    {/* Convert the light backing to transparency while retaining the original lettering. */}
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.4252 -1.4304 -0.1444 0 1.5" result="lettering"/>
    <feFlood floodColor="currentColor" result="ink"/>
    <feComposite in="ink" in2="lettering" operator="in"/>
   </filter>
  </defs>
  <image href={BRAND.logo} width="2000" height="2000" filter={`url(#${filterId})`}/>
 </svg>;
}
