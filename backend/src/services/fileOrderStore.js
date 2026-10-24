import {mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function saveDemoOrder(order,dataDir) {
 await mkdir(dataDir,{recursive:true});
 const target=resolve(dataDir,order.orderId+'.json');
 await writeFile(target+'.tmp',JSON.stringify(order,null,2),{flag:'wx',mode:0o600});
 await rename(target+'.tmp',target);
 return order;
}
