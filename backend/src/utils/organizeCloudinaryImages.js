import {getPool,closePool} from '../config/db.js';
import {configureCloudinary} from '../config/cloudinary.js';
import {organizeCloudinaryImages} from '../services/organizeCloudinaryImages.js';
try{
 const preview=!process.argv.includes('--apply');
 const result=await organizeCloudinaryImages(getPool(),preview?null:configureCloudinary(),{preview});
 console.log(JSON.stringify(result));
 if(preview)console.log('Для переміщення: npm run cloudinary:organize -- --apply');
 if(result.failed)process.exitCode=1;
}catch(error){
 console.error('Переміщення зупинено. Повторний запуск продовжить роботу. Код:',error.error?.code||error.code||error.http_code||'MOVE_ERROR');
 if(error.code==='42P01'||error.code==='42703')console.error('Спочатку виконайте npm run db:migrate.');
 process.exitCode=1;
}finally{await closePool();}
