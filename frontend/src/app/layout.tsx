import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import Providers from './providers';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import CartModal from '@/components/CartModal/CartModal';
import {BRAND} from '@/constants/brand';
export const metadata: Metadata = {
 title:{default:BRAND.name,template:`%s | ${BRAND.name}`},
 description:BRAND.description,
 applicationName:BRAND.name,
 manifest:'/manifest.webmanifest',
 openGraph:{title:BRAND.name,description:BRAND.description,siteName:BRAND.name,locale:'uk_UA',type:'website'},
 twitter:{card:'summary',title:BRAND.name,description:BRAND.description},
};
const THEME_SCRIPT="try{document.documentElement.dataset.theme=localStorage.getItem('kateryna-theme')==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}";
export default function RootLayout({children}:{children:ReactNode}){
 return <html lang="uk" suppressHydrationWarning><head><link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" type="image/x-icon"/><script dangerouslySetInnerHTML={{__html:THEME_SCRIPT}}/></head><body><Providers><Header/>{children}<Footer/><CartModal/></Providers></body></html>;
}
