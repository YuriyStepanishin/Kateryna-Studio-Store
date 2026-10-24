// WordPress image sizes refer to the same photo; try the original when a thumbnail is gone.
export function imageCandidates(source){
 const url=new URL(source);
 const candidates=[source];
 if(['cotril.it','www.cotril.it'].includes(url.hostname)&&url.pathname.startsWith('/wp-content/uploads/')){
  const path=url.pathname.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i,'');
  if(path!==url.pathname){url.pathname=path;candidates.push(url.href);}
 }
 return candidates;
}
export async function uploadImportedImage(cloudinary,source,options){
 const candidates=imageCandidates(source);
 let lastError;
 for(const candidate of candidates){
  try{return await cloudinary.uploader.upload(candidate,options);}
  catch(error){lastError=error;if(Number(error.http_code)!==404)throw error;}
 }
 throw lastError;
}
