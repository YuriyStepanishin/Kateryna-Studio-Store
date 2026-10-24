import {createApp} from './src/app.js';
import {readEnv} from './src/config/env.js';
import {closePool} from './src/config/db.js';
const config=readEnv();
const server=createApp(config).listen(config.port,config.host,()=>console.log('Store API listening on port',config.port,'mode:',config.mode));
server.requestTimeout=15000;server.headersTimeout=10000;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(async()=>{await closePool();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
