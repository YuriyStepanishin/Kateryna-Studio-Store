export function productFromHtml(html,pageUrl){
 const products=[];
 function walk(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(walk);return;}if([value['@type']].flat().includes('Product'))products.push(value);if(value['@graph'])walk(value['@graph']);}
 for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(match[1]));}catch{}}
 const product=products.find(p=>p.url&&new URL(p.url,pageUrl).pathname===new URL(pageUrl).pathname)||(products.length===1?products[0]:null);
 if(!product)return null;
 const image=[product.image].flat().map(i=>typeof i==='string'?i:i?.url||i?.contentUrl).filter(Boolean).map(i=>new URL(i,pageUrl).href).filter(i=>{const u=new URL(i);return u.protocol==='https:'&&['full-force.com.ua','www.full-force.com.ua'].includes(u.hostname)&&u.pathname.startsWith('/content/images/');});
 return {name:String(product.name||''),sku:String(product.sku||''),images:[...new Set(image)]};
}
export function sameProduct(source,current){
 if(!source.article||!current.sku||source.article.trim()!==current.sku.trim())return false;
 const volumes=s=>[...s.toLowerCase().replace(/,/g,'.').matchAll(/(\d+(?:\.\d+)?)\s*(ml|мл|літр|л|kg|кг|g|гр|г)(?![\p{L}])/gu)].map(m=>m[1]+m[2].replace('мл','ml').replace('кг','kg').replace(/^(гр|г)$/,'g')).sort().join('|');
 const before=volumes(source.title||'');return Boolean(before)&&before===volumes(current.name);
}
