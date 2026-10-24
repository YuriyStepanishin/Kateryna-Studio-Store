import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import Providers from './providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {BRAND} from '@/constants/brand';
export const metadata: Metadata = {
 title:{default:BRAND.name,template:`%s | ${BRAND.name}`},
 description:BRAND.description,
 applicationName:BRAND.name,
 icons:{icon:[{url:BRAND.logo,type:'image/png'}],apple:BRAND.logo},
 openGraph:{title:BRAND.name,description:BRAND.description,siteName:BRAND.name,locale:'uk_UA',type:'website'},
 twitter:{card:'summary',title:BRAND.name,description:BRAND.description},
};
export default function RootLayout({children}:{children:ReactNode}){
 return <html lang="uk" suppressHydrationWarning><body><Providers><Header/>{children}<Footer/></Providers></body></html>;
}
