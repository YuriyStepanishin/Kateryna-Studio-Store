import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {configureCloudinary} from '../config/cloudinary.js';

const MAX_AGE_SECONDS=3600;
const TYPES={
 image:{folder:'omee/images',resourceType:'image',preset:'omee_signed_images',maxBytes:5*1024*1024,formats:['jpg','jpeg','png','webp']},
 video:{folder:'omee/videos',resourceType:'video',preset:'omee_signed_videos',maxBytes:25*1024*1024,formats:['mp4','webm']}
};
const signedId=/^u(\d{10})_([a-f0-9]{32})_([a-f0-9]{64})$/;
const invalid=()=>Object.assign(new Error('Завантажений файл не пройшов перевірку.'),{status:400});

function typeConfig(kind){
 const config=TYPES[kind];
 if(!config)throw Object.assign(new Error('Непідтримуваний тип файлу.'),{status:400});
 return config;
}
function signatureFor(kind,timestamp,nonce,secret){
 return createHmac('sha256',secret).update(`${kind}:${timestamp}:${nonce}`).digest('hex');
}
function verifyPublicId(publicId,kind,secret){
 const config=typeConfig(kind),match=signedId.exec(publicId);
 if(!match)throw invalid();
 const [,timestamp,nonce,provided]=match;
 const expected=signatureFor(kind,timestamp,nonce,secret);
 if(!timingSafeEqual(Buffer.from(provided,'hex'),Buffer.from(expected,'hex')))throw invalid();
 return {config,timestamp:Number(timestamp)};
}
function cloudinaryOptions(env,client){
 const cloudinary=client||configureCloudinary(env);
 const cloudName=env.CLOUDINARY_CLOUD_NAME.trim();
 const apiKey=env.CLOUDINARY_API_KEY.trim();
 const apiSecret=env.CLOUDINARY_API_SECRET.trim();
 return {cloudinary,cloudName,apiKey,apiSecret};
}

export function createUploadSignature(input,env=process.env,client){
 if(!input||typeof input!=='object')throw Object.assign(new Error('Некоректні параметри завантаження.'),{status:400});
 const {kind,size}=input;
 const config=typeConfig(kind);
 if(!Number.isSafeInteger(size)||size<1)
  throw Object.assign(new Error('Некоректний розмір файлу.'),{status:400});
 if(size>config.maxBytes)
  throw Object.assign(new Error(`Файл завеликий. Максимум ${config.maxBytes/(1024*1024)} МБ.`),{status:413});
 const {cloudinary,cloudName,apiKey,apiSecret}=cloudinaryOptions(env,client);
 const timestamp=Math.floor(Date.now()/1000);
 const nonce=randomBytes(16).toString('hex');
 const publicId=`u${timestamp}_${nonce}_${signatureFor(kind,timestamp,nonce,apiSecret)}`;
 const params={
  timestamp,
  upload_preset:config.preset,
  folder:config.folder,
  asset_folder:config.folder,
  public_id:publicId,
  allowed_formats:config.formats.join(',')
 };
 return {
  ...params,
  signature:cloudinary.utils.api_sign_request(params,apiSecret),
  apiKey,
  cloudName,
  resourceType:config.resourceType
 };
}

export async function verifyUploadedAsset(input,env=process.env,client){
 if(!input||typeof input!=='object'||typeof input.kind!=='string'||typeof input.publicId!=='string'||typeof input.secureUrl!=='string')
  throw Object.assign(new Error('Некоректні дані завантаженого файлу.'),{status:400});
 const {kind,publicId,secureUrl}=input;
 const {cloudinary,cloudName,apiSecret}=cloudinaryOptions(env,client);
 const {config,timestamp}=verifyPublicId(publicId,kind,apiSecret);
 if(typeof secureUrl!=='string'||secureUrl.length>2000)throw invalid();
 let parsed;
 try{parsed=new URL(secureUrl);}catch{throw invalid();}
 if(parsed.protocol!=='https:'||parsed.hostname!=='res.cloudinary.com'||parsed.search||parsed.hash)throw invalid();
 const now=Math.floor(Date.now()/1000);
 if(timestamp>now+60||timestamp<now-MAX_AGE_SECONDS-60)throw invalid();

 let asset;
 const candidates=[`${config.folder}/${publicId}`,publicId];
 for(const candidate of candidates){
  try{
   asset=await cloudinary.api.resource(candidate,{resource_type:config.resourceType,type:'upload'});
   break;
  }catch(error){
   if(error.http_code!==404&&error.error?.http_code!==404)
    throw Object.assign(new Error('Не вдалося перевірити файл у Cloudinary.'),{status:502});
  }
 }
 const createdAt=Date.parse(asset?.created_at||'');
 const assetPublicId=typeof asset?.public_id==='string'?asset.public_id.split('/').at(-1):'';
 const assetFolder=asset?.asset_folder||asset?.folder;
 const format=String(asset?.format||'').toLowerCase();
 if(!asset||
  assetPublicId!==publicId||
  assetFolder!==config.folder||
  asset.resource_type!==config.resourceType||
  !config.formats.includes(format)||
  !Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>config.maxBytes||
  !Number.isFinite(createdAt)||createdAt<(timestamp-60)*1000||createdAt>(now+60)*1000||
  asset.secure_url!==secureUrl||
  !asset.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/`)||
  !asset.secure_url.includes(`/${cloudName}/`)
 )throw invalid();
 return {url:asset.secure_url,publicId:asset.public_id,resourceType:asset.resource_type,format,bytes:asset.bytes};
}

export async function verifySignedCloudinaryUrl(url,kind,env=process.env,client){
 let parsed;
 try{parsed=new URL(url);}catch{return;}
 if(parsed.hostname!=='res.cloudinary.com')return;
 if(parsed.protocol!=='https:'||parsed.search||parsed.hash)throw invalid();
 const cloudName=env.CLOUDINARY_CLOUD_NAME?.trim();
 if(!cloudName)throw invalid();
 const escapedCloudName=cloudName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=parsed.pathname.match(new RegExp(`^/${escapedCloudName}/(image|video)/upload/(.+)$`));
 if(!match)throw invalid();
 const resourceType=match[1];
 const config=typeConfig(kind);
 if(resourceType!==config.resourceType)throw invalid();
 const segments=match[2].split('/');
 const versionIndex=segments.findIndex(segment=>/^v\d+$/.test(segment));
 if(versionIndex<0||versionIndex===segments.length-1)throw invalid();
 let resourcePublicId;
 try{resourcePublicId=decodeURIComponent(segments.slice(versionIndex+1).join('/'));}catch{throw invalid();}
 if(!resourcePublicId||resourcePublicId.includes('\\'))throw invalid();
 const publicId=resourcePublicId.replace(/\.[a-z0-9]+$/i,'');
 const signedPublicId=publicId.startsWith(`${config.folder}/`)
  ?publicId.slice(config.folder.length+1)
  :publicId;
 const version=Number(segments[versionIndex].slice(1));
 if(signedId.test(signedPublicId)){
  await verifyUploadedAsset({kind,publicId:signedPublicId,secureUrl:url},env,client);
  return;
 }

 const {cloudinary}=cloudinaryOptions(env,client);
 let asset;
 try{
  asset=await cloudinary.api.resource(publicId,{resource_type:resourceType,type:'upload'});
 }catch(error){
  if(error.http_code===404||error.error?.http_code===404)throw invalid();
  throw Object.assign(new Error('Не вдалося перевірити файл у Cloudinary.'),{status:502});
 }
 let assetUrl;
 try{assetUrl=new URL(asset?.secure_url||'');}catch{throw invalid();}
 if(asset?.public_id!==publicId||asset.resource_type!==resourceType||
  !Number.isSafeInteger(asset.version)||asset.version!==version||assetUrl.protocol!=='https:'||
  assetUrl.hostname!=='res.cloudinary.com'||assetUrl.pathname!==`/${cloudName}/${resourceType}/upload/v${asset.version}/${publicId}.${asset.format}`||
  typeof asset.format!=='string'||resourcePublicId!==`${publicId}.${asset.format}`
 )throw invalid();
}

export async function verifyUploadedUrls(urls,kind,env=process.env,client){
 for(const url of urls)if(url)await verifySignedCloudinaryUrl(url,kind,env,client);
}
