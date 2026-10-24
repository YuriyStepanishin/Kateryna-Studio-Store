import {z} from 'zod';
const email=z.string().trim().email('Вкажіть коректний email.').max(254).transform(value=>value.toLowerCase());
const password=z.string().min(8,'Пароль має містити щонайменше 8 символів.').refine(value=>Buffer.byteLength(value,'utf8')<=72,'Пароль завеликий. Максимум 72 байти.');
export const registerSchema=z.object({name:z.string().trim().min(2,'Вкажіть ім’я.').max(120),email,password,phone:z.string().trim().max(25).optional()}).strict();
export const loginSchema=z.object({email,password:z.string().min(1).refine(value=>Buffer.byteLength(value,'utf8')<=72)}).strict();
export function parseAuth(schema,body){const result=schema.safeParse(body);if(!result.success)throw Object.assign(new Error(result.error.issues[0]?.message||'Перевірте введені дані.'),{status:400});return result.data;}
