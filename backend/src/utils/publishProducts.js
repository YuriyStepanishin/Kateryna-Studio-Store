import {getPool,closePool} from '../config/db.js';
import {publishAllProducts} from '../services/publishAllProducts.js';
try{console.log(JSON.stringify(await publishAllProducts(getPool())));}
catch(error){console.error('Публікацію не виконано; зміни відкочено. Код:',error.code||'PUBLISH_ERROR');process.exitCode=1;}
finally{await closePool();}
