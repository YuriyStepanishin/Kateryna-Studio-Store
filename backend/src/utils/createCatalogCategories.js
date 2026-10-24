import {getPool,closePool} from '../config/db.js';
import {createCatalogCategories} from '../services/materializeProductCategories.js';
try{console.log(JSON.stringify(await createCatalogCategories(getPool())));}
catch(error){console.error('Не вдалося створити категорії. Код:',error.code||'CATEGORY_ERROR');process.exitCode=1;}
finally{await closePool();}
