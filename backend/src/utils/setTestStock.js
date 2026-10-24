import {getPool,closePool} from '../config/db.js';
import {setTestStock} from '../services/testStock.js';
try{console.log(JSON.stringify(await setTestStock(getPool())));}
catch(error){console.error('Залишки не оновлено. Код:',error.code||'STOCK_ERROR');process.exitCode=1;}
finally{await closePool();}
