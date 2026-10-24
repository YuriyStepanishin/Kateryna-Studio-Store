import {getPool,closePool} from '../config/db.js';
import {prepareCatalog} from '../services/prepareCatalog.js';
try{console.log(JSON.stringify(await prepareCatalog(getPool()),null,2));}
catch(error){console.error('Каталог не змінено. Код:',error.code||'PREPARE_ERROR');process.exitCode=1;}
finally{await closePool();}
