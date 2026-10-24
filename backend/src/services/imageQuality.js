export function photoIdentity(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:')return null;
  if(['cotril.it','www.cotril.it'].includes(url.hostname))return 'cotril.it'+url.pathname.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i,'');
  if(['full-force.com.ua','www.full-force.com.ua'].includes(url.hostname))return 'full-force.com.ua'+url.pathname.replace(/\/\d+x\d+[^/]*\//,'/');
  return null;
 }catch{return null;}
}
export function betterResolution(current,candidate){
 return Number.isFinite(current.width)&&Number.isFinite(current.height)&&Number.isFinite(candidate.width)&&Number.isFinite(candidate.height)
  &&Math.min(candidate.width,candidate.height)>=600&&candidate.width>=current.width&&candidate.height>=current.height
  &&candidate.width*candidate.height>current.width*current.height;
}
export function smallPhoto(photo){return Number.isFinite(photo.width)&&Number.isFinite(photo.height)&&Math.min(photo.width,photo.height)<600;}
