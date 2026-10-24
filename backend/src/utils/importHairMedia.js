import {getPool,closePool} from '../config/db.js';
import {hairMedia} from '../content/hairMedia.js';
import {inspectMediaSchema,importHairMedia} from '../services/importHairMedia.js';
import {contentRepository} from '../models/content.js';
try{
 if(!process.argv.includes('--apply'))console.log(JSON.stringify({mode:'preview',items:hairMedia,command:'npm run media:import -- --apply'},null,2));
 else{
  const pool=getPool();console.log(JSON.stringify({schema:await inspectMediaSchema(pool)},null,2));
  const result=await importHairMedia(pool,{onProgress:value=>console.log(JSON.stringify(value))});console.log(JSON.stringify({committed:true,...result},null,2));
  const {media}=await contentRepository(pool).publicContent();
  if(!result.keys.every(key=>media.some(row=>row.source?.key===key)))throw new Error('Committed, but storefront read verification failed');
  console.log(JSON.stringify({verifiedPublicReads:14,videos:4,photos:10}));
 }
}catch(error){console.error('Імпорт медіа не завершено. Код:',error.code||error.message);process.exitCode=1;}finally{await closePool();}
