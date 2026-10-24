import {z} from 'zod';
import {validate} from './catalog.js';
const image=z.string().url().max(2000).refine(value=>new URL(value).protocol==='https:','Потрібне HTTPS-посилання.');
export const bannerSchema=z.object({title:z.string().trim().min(2).max(200),imageUrl:image,link:z.string().max(2000).refine(value=>value===''||(/^\/(?!\/)/.test(value)&&!value.includes('\\'))||value.startsWith('https://'),'Посилання повинне починатися з / або https://.'),isActive:z.boolean().default(true)}).strict();
export const mediaSchema=z.object({title:z.string().trim().min(2).max(200),type:z.enum(['photo','video']),url:image,cover:image.or(z.literal('')).default(''),isActive:z.boolean().default(true),sortOrder:z.number().int().min(0).max(10000).default(0)}).strict();
export const infoSchema=z.object({heading:z.string().trim().min(2).max(200),description:z.string().max(5000),points:z.array(z.string().max(300)).max(20),phone:z.string().max(50),email:z.string().email().or(z.literal('')),instagram:image.or(z.literal('')),address:z.string().max(300),announcement:z.string().max(500)}).strict();
export const promoSchema=z.object({code:z.string().trim().min(2).max(60).regex(/^[a-zA-Z0-9_-]+$/).transform(value=>value.toUpperCase()),discount:z.number().min(0.01).max(100),isActive:z.boolean().default(true),expiresAt:z.string().datetime({offset:true}).nullable()}).strict();
export {validate};
