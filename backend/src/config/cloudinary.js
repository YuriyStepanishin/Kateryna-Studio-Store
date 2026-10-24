import {v2 as cloudinary} from 'cloudinary';

export function configureCloudinary(env=process.env){
 const keys=['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'];
 if(keys.some(key=>!env[key]?.trim()))throw Object.assign(new Error('Cloudinary ще не налаштовано. Додайте ключі в backend/.env.'),{status:503});
 cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME.trim(),api_key:env.CLOUDINARY_API_KEY.trim(),api_secret:env.CLOUDINARY_API_SECRET.trim(),secure:true});
 return cloudinary;
}
