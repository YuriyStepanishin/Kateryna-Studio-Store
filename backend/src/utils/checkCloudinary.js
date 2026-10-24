import {configureCloudinary} from '../config/cloudinary.js';
try{
 const result=await configureCloudinary().api.ping({timeout:15000});
 if(result.status!=='ok')throw Error('Unexpected response');
 console.log('Cloudinary: підключення успішне.');
}catch(error){
 const code=error.error?.code||error.code||error.http_code;
 console.error(code==='ENOTFOUND'?'Cloudinary: DNS не зміг знайти сервер. Перевірте мережу.':code===401||code===403?'Cloudinary: перевірте Cloud name, API Key та API Secret.':error.status===503?error.message:'Cloudinary: підключення не вдалося. Код: '+(code||'UNKNOWN'));
 process.exitCode=1;
}
